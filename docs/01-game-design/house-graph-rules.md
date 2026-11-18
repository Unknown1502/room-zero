# House graph rules

The designer-facing rules of the house. The engineering form, with types and algorithms, is `04-engineering/domain-model.md`. If the two differ, the domain model is correct and this document is to be fixed.

## 1. What the graph is

- A **node** is a room module.
- An **edge** is a pair of sockets, one on each of two different modules, that are currently mated.
- The graph is recomputed from the seams' committed detents and the chapter's flags. It is never read from where anything is drawn (REQ-GRAPH-001, REQ-GRAPH-005).

The same graph answers three questions: where can the player hop, is a puzzle solved, and where can the Surveyor walk.

## 2. When two sockets connect

All five must hold (REQ-GRAPH-002).

| # | Condition | Rule | Starting value |
|---|---|---|---|
| 1 | Position | The two socket origins coincide | within 0.05 m |
| 2 | Orientation | Their outward normals are opposed and their up vectors agree | each within 2 degrees |
| 3 | Compatibility | Their profiles are the same: arched with arched, square with square, round with round | exact |
| 4 | Module state | Neither module is in motion, and neither socket is already mated | exact |
| 5 | Puzzle rules | The pair is not forbidden by a chapter rule | none in chapter one |

Collision is the sixth gate, applied earlier: a room cannot be brought to a detent at all if its path there is blocked (section 5), so two rooms never rest overlapping.

Because rooms rest only at authored detents, conditions 1 and 2 are either exactly met or clearly not. The tolerances exist to validate the authored data: a test computes every socket pose at every detent combination and fails if any pair is "nearly" connected, between 0.05 m and 0.5 m or between 2 and 20 degrees, since that would look connected and not be (UT-CONN-06).

## 3. What an edge carries

| Attribute | Meaning | Set by |
|---|---|---|
| `open` | The pair is mated | Computed |
| `playerTraversable` | The courier can pass | Authored on the socket pair |
| `enemyTraversable` | The Surveyor can pass | Authored on the socket pair |
| `locked` | Mated but barred | A chapter flag |
| `suspended` | A seam this edge depends on is in the player's hand | Computed from manipulation state |
| `puzzleActive` | The edge counts toward a current objective | Puzzle engine, for feedback only |

Someone may start through an edge only if it is open, not locked, not suspended, and traversable by them.

## 4. Seams

- A seam moves exactly one module along one path: a straight line or an arc about an axis.
- A seam has two or more detents. A cyclic rotary seam returns to its first detent after its last.
- At rest a seam is always at a detent. In the hand it has a continuous position used only for drawing and preview.
- A seam may have more than one station. It is still one seam. Only one station can hold it at a time (REQ-SEAM-011).
- A station is never inside the module its seam moves (REQ-SEAM-008).

## 5. Blocking

Each module has a coarse collision volume made of boxes, authored by hand. For each seam, the tool computes which stretches of its path are blocked given where every other module currently rests. The player feels a hard stop at the edge of a blocked stretch and sees an ash outline of the collision.

Blocking is evaluated against other modules' committed positions only. Two seams cannot be in motion at once in a way that matters, because a second seam held at the same station sees the first as "in motion" and treats every stretch that depends on it as blocked.

## 6. Who can move a seam, and when

A grab is refused, with a visible and audible reason, when:

| Reason | What the player sees |
|---|---|
| The seam is latched and the anchor grip is not held | The latch rattles; the anchor grip pulses |
| The Surveyor is in a doorway that depends on this seam | Its hand is on the door frame; the grip is stiff and chalk dust falls |
| Another station is holding this seam | Cannot occur with one player; guarded anyway |
| The player is inside the module the seam moves | Cannot occur by construction; guarded anyway |

## 7. What happens on commit

1. The seam's detent is updated.
2. The graph is recomputed.
3. The difference is published: edges opened, edges closed.
4. Each opened edge becomes a *fresh joint* for the Surveyor.
5. Puzzle objectives are evaluated.
6. Reachable vantages are recomputed and lamps updated.
7. The Surveyor is told. It reacts on its next tick.

This order is fixed (REQ-GRAPH-004, REQ-STATE-005).

## 8. Things that ride

Anything inside a module moves with it. The Surveyor rides the module it is in: it crouches and braces while the module is in the player's hand, and its walk timer is paused for that time. The player is never in a moving module.

## 9. Invariants

These must be true after every commit, and tests check them over random command sequences (UT-GRAPH-06).

1. Every edge joins two different modules.
2. A socket is in at most one edge.
3. If A is joined to B then B is joined to A, with the same attributes.
4. Every open edge satisfies section 2.
5. No two modules' collision volumes overlap at rest.
6. The player's vantage belongs to an existing module.
7. The Surveyor is in an existing module, or in a doorway whose edge is open.
8. No seam whose dependent edge is being crossed has changed during the crossing.
9. Recomputing the graph from the seam detents and flags gives the same graph that is stored.

## 10. Authoring checklist for a new module

1. Give it an ID, a base pose, and collision boxes.
2. List its sockets with local pose and profile.
3. If it moves, define its seam: path, detents, hands, stations.
4. Declare which socket pairs you intend to connect at which detents.
5. Run the content validation. It computes the real connections and reports any that differ from your declaration, any near-miss, and any overlap at rest.
6. Give every vantage a module, a pose and its adjacent vantages.
7. Run the softlock check (MC-01).
