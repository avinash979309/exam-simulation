# ASSUMPTIONS.md

Engineering assumptions made where spec was ambiguous.

---

## Building Graph

1. **Default graph topology is auto-generated** from classroom/floor config.
   - Rule: All classrooms on the same floor share one corridor per floor.
   - Rule: Floors are connected by all configured stairs.
   - Rule: Checking room is on Floor 1, connected to Floor 1 corridor.
   - Users can override graph edges via the API config.

2. **Corridor capacity** defaults to `sum of connected classrooms' students × 1.5`.
   If not specified by user, auto-calculated.

3. **Travel time** for corridor segments defaults to `distance / 1.4 m/s` (avg walking speed).
   Stair traversal time is user-configured (default 30s).

---

## Students

4. Students are represented as **aggregated groups**, not individual objects.
   - A `StudentGroup` = (source_class, destination_class, subject, count).
   - Individual `student_id` / `roll_number` are only materialized for answer-sheet tags.
   - Roll numbers are assigned sequentially per classroom: `{class_id}-{seq}`.
   - This keeps simulation O(groups) not O(N_students).

5. Students **not assigned a next destination** remain in their current classroom (they have a free period / no next exam). They do not move.

---

## Teachers

6. **One teacher per classroom** by default. Teacher starts in their assigned classroom.
7. Teacher collects all answer sheets from that classroom (all students who wrote the exam, regardless of where they go next).
8. Teacher moves to checking room via the **shortest path** in the graph.
9. Teacher travel starts after a configurable **collection delay** (default: 2 minutes after exam end).

---

## Answer Sheets

10. Answer sheet ID format: `{roll_number}-{subject_code}` (e.g., `101-SCI`).
11. Subject code is user-configurable (3-char string). Defaults to first 3 chars of subject name, uppercased.
12. All answer sheets from one classroom are transported by that room's teacher as a **single batch**.

---

## Checking Room

13. Checking room is a **single node** in the graph with a single queue.
14. Processing order: FIFO across all incoming teacher batches.
15. Each desk processes one answer sheet at a time.
16. If `n` desks are free and a batch of `m` sheets arrives, min(n, m) desks activate immediately.

---

## Scheduling / Batching

17. **Batch size** = `min(stair_capacity, pathway_capacity, sub_batch_size_config)`.
18. Students are released from source classrooms in sub-batches at each `sub_batch_interval`.
19. Students with the **same destination** from different source classrooms are merged into a global destination queue before being released into the path.
20. Release order within a queue: FIFO by arrival time in queue.

---

## Simulation Time

21. Simulation clock starts at **t=0** (representing "exam end").
    - Times are displayed as offsets: `+0:00`, `+5:30`, etc.
    - No real-world clock is required; the spec's "10:00" is cosmetic.
    - The UI will display a configurable "exam end time" as the base (default `10:00`).

22. **Simulation terminates** when all students have reached destinations (or timeout) AND all answer sheets are checked.

---

## Capacity

23. Stair capacity = maximum **simultaneous occupants** during a traversal window.
    A traversal window = stair traversal time.
    So at any given second, at most `capacity` people are on the stair.

24. Corridor capacity = max simultaneous occupants on that corridor segment.

---

## Simplifications (marked as ponytail debt)

25. No elevator support (Future Extensions, section 45).
26. Single checking room only.
27. No dynamic route re-selection mid-movement (path chosen at release time).
28. No RL-based scheduling.
29. No WebSocket streaming; frontend polls `/state` endpoint.
30. No database; all state is in-memory per simulation session.
31. Multiple concurrent simulation sessions use a simple dict keyed by `simulation_id` (UUID).

---

## Frontend

32. SVG-based building map (not React Flow) — sufficient and simpler per spec's own note.
33. Animation is driven by the backend event timeline. Frontend replays events at configurable speed.
34. No mobile layout optimization. Desktop-first.
