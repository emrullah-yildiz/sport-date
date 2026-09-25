import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { Children, isValidElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const hooks = vi.hoisted(() => ({ active: false, cursor: 0, slots: [] as unknown[], refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: hooks.refresh }) }));
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useState: (initial: unknown) => {
      if (!hooks.active) return actual.useState(initial);
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = initial;
      return [hooks.slots[index], (next: unknown) => { hooks.slots[index] = typeof next === "function" ? next(hooks.slots[index]) : next; }];
    },
    useRef: (initial: unknown) => {
      if (!hooks.active) return actual.useRef(initial);
      const index = hooks.cursor++;
      if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
      return hooks.slots[index];
    },
  };
});

import EditProfileForm, { EditProfileConfirmation } from "./EditProfileForm";
import ConnectionChoices from "./ConnectionChoices";

afterEach(() => { hooks.active = false; hooks.slots = []; hooks.cursor = 0; vi.unstubAllGlobals(); vi.clearAllMocks(); });

// The container (EditProfileForm) PATCHes on submit and only renders the
// confirmation after a successful save — neither the fetch nor the success
// re-render is run by renderToStaticMarkup. So, exactly like the verified
// FeedbackConfirmation, the success moment is asserted directly through the
// presentational EditProfileConfirmation — the exact JSX the container mounts on
// success — where the acceptance-criteria markup lives (focusable, polite live
// region). Focus movement itself is driven by the container's attachConfirmation
// callback ref and is exercised live in the app.
//
// Regression target: CX-20260702-profile-edit-save-hard-reload-no-focus-or-announcement.
// The old success path called window.location.reload() right after setting the
// message, which destroyed the role="status" confirmation before assistive tech
// could read it and dropped focus to <body>. The source tripwires below fail the
// build if that anti-pattern returns.

const POLITE_LIVE_REGION = /role="status"[^>]*aria-live="polite"|aria-live="polite"[^>]*role="status"/;
const FOCUSABLE_STATUS = /<p[^>]*tabindex="-1"/i;

function render() {
  return renderToStaticMarkup(<EditProfileConfirmation />);
}

const source = readFileSync(fileURLToPath(new URL("./EditProfileForm.tsx", import.meta.url)), "utf8");

describe("EditProfileForm save confirmation (success state)", () => {
  it("announces the calm result inside a polite live region that survives the save", () => {
    const html = render();
    expect(html).toMatch(POLITE_LIVE_REGION);
    expect(html).toContain("Profile updated.");
  });

  it("makes the confirmation a keyboard focus target so focus moves to it, not <body>", () => {
    // tabindex=-1 lets the container's callback ref move focus here after a
    // successful save — a keyboard / screen-reader member is never dumped to
    // <body> as the old window.location.reload() did.
    expect(render()).toMatch(FOCUSABLE_STATUS);
  });

  it("stays calm and dignified — no gamification of profile edits", () => {
    expect(render()).not.toMatch(/streak|score|points|badge|keep it up|well done/i);
  });
});

describe("EditProfileForm save path (regression: no hard reload)", () => {
  it("never reloads the document on save — the confirmation is not torn down", () => {
    // The exact anti-pattern this ticket fixes. A full-document reload destroys
    // the role="status" confirmation before it can be announced and drops focus
    // to <body>. It must stay gone.
    expect(source).not.toMatch(/window\.location\.reload/);
  });

  it("resolves in place via router.refresh() so rendered sections re-sync without a hard nav", () => {
    expect(source).toContain("router.refresh()");
  });

  it("keeps a separate role=alert for a failed save so the editor stays usable", () => {
    // Errors keep their own alert region; a failed save re-enables the button
    // (setSaving(false)) and never overwrites the success confirmation.
    expect(source).toMatch(/role="alert"/);
    expect(source).toMatch(/setSaving\(false\)/);
  });
});

const profile = {
  firstName: "Ana", lastName: "Example", location: "Bucharest", bio: "A relaxed game", languages: ["English"], seeking: "friendship" as const,
  sports: [{ name: "Tennis", skillLevel: "beginner" as const, frequency: "casual" as const }], prompts: [],
  gender: null, genderSelfDescribe: "", genderVisible: false, sexualOrientation: null, orientationSelfDescribe: "", orientationVisible: false, orientationConsent: false,
};
function editor() { hooks.active = true; hooks.cursor = 0; return EditProfileForm({ profile }); }
function find(node: ReactNode, predicate: (type: unknown, props: Record<string, unknown>) => boolean): Record<string, unknown> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<Record<string, unknown>>(child)) continue;
    if (predicate(child.type, child.props)) return child.props;
    const nested = find(child.props.children as ReactNode, predicate);
    if (nested) return nested;
  }
}
const form = (tree: ReactNode) => find(tree, (type) => type === "form")!;
const fields = (tree: ReactNode) => find(tree, (type, props) => type === "fieldset" && props["aria-label"] === "Profile details")!;

describe("EditProfileForm pending save and subsequent edits", () => {
  it("saves every selected connection preference and blocks an empty selection", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    let tree = editor();
    const choices = () => find(tree, (type) => type === ConnectionChoices)!;
    expect(choices().value).toEqual(["friendship"]);
    (choices().onChange as (value: string[]) => void)([]);
    tree = editor();
    await (form(tree).onSubmit as (event: { preventDefault(): void }) => Promise<void>)({ preventDefault() {} });
    expect(fetchMock).not.toHaveBeenCalled();
    (choices().onChange as (value: string[]) => void)(["dating", "friendship", "group"]);
    tree = editor();
    await (form(tree).onSubmit as (event: { preventDefault(): void }) => Promise<void>)({ preventDefault() {} });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).seekingPreferences).toEqual(["dating", "friendship", "group"]);
  });
  it("locks all editable controls during a delayed request, rejects duplicate submits and clears success on another edit", async () => {
    let finish!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; }));
    vi.stubGlobal("fetch", fetchMock);
    let tree = editor();
    const submit = form(tree).onSubmit as (event: { preventDefault(): void }) => Promise<void>;
    const saving = submit({ preventDefault() {} });
    await submit({ preventDefault() {} });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    tree = editor();
    expect(fields(tree).disabled).toBe(true);
    // Native fieldset disabling covers every input/select/textarea and the
    // sport/prompt/identity buttons, including nested fieldsets.
    const editableMarkup = renderToStaticMarkup(<fieldset disabled>{fields(tree).children as ReactNode}</fieldset>);
    expect(editableMarkup).toContain('id="edit-profile-bio"');
    expect(editableMarkup).toContain('id="edit-profile-sports"');
    expect(editableMarkup).toContain('id="edit-profile-identity"');
    expect(find(tree, (type) => type === EditProfileConfirmation)).toBeUndefined();
    finish(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await saving;
    tree = editor();
    expect(fields(tree).disabled).toBe(false);
    expect(find(tree, (type) => type === EditProfileConfirmation)?.message).toBe("Profile updated.");
    expect(find(fields(tree).children as ReactNode, (type) => type === EditProfileConfirmation)).toBeUndefined();
    (fields(tree).onChangeCapture as () => void)();
    expect(find(editor(), (type) => type === EditProfileConfirmation)).toBeUndefined();
  });

  it("unlocks after a failed request without claiming the profile was saved", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Connection interrupted")));
    await (form(editor()).onSubmit as (event: { preventDefault(): void }) => Promise<void>)({ preventDefault() {} });
    const tree = editor();
    expect(fields(tree).disabled).toBe(false);
    expect(find(tree, (_type, props) => props.role === "alert")?.children).toBe("Connection interrupted");
    expect(find(tree, (type) => type === EditProfileConfirmation)).toBeUndefined();
  });
});
