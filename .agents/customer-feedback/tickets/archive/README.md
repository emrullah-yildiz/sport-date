# Completed ticket archive

`verified` (fully done, retested) and `superseded` (folded into another ticket)
tickets are moved here to keep the active queue in
`.agents/customer-feedback/tickets/` small and scannable.

- The loop's agents scan the **active** queue via the non-recursive glob
  `.agents/customer-feedback/tickets/CX-*.md`, so files in this `archive/` folder are
  **not** picked up as work.
- **Dedup rule:** when filing a new ticket, agents must still check this archive (a
  problem may already have been fixed) — dedup against BOTH the active queue and
  `archive/` before filing, and reopen an archived ticket (move it back + set `ready`)
  rather than filing a duplicate if a fixed issue has regressed.
- Nothing here is deleted; it is the record of completed customer-experience work.
