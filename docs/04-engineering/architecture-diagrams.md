# Architecture diagrams

All required diagrams in one place. Each is the picture of text that exists elsewhere; if a diagram and its source document differ, the document is right.

## 1. System context

Source: `technical-architecture.md` section 2.

```mermaid
flowchart LR
    P([Player: head and two hands])
    subgraph Headset [Meta Quest headset]
        T[Head and hand tracking]
        subgraph Browser [Quest Browser]
            X[WebXR Device API]
            subgraph SDK [IWSDK runtime]
                W[World, XR session, render loop]
                I[Input and grab systems]
                A[Audio system]
                R[Three.js renderer]
            end
            subgraph App [Room Zero application]
                AD[Input adapters]
                GD[Game Director]
                DOM[Gameplay domain: house graph, seams, puzzles, Surveyor]
                PR[Presentation systems]
                PS[Persistence]
            end
            LS[(Local storage)]
        end
        D[Displays and speakers]
    end
    H[(Static HTTPS host)]

    P --> T --> X --> W
    W --> I --> AD
    AD -- commands --> GD
    GD -- apply and tick --> DOM
    DOM -- events and view --> GD --> PR
    PR --> R --> D
    PR --> A --> D
    GD --> PS <--> LS
    H -- HTML, scripts, assets --> Browser
    D --> P
```

## 2. Component architecture

Source: `system-components.md`.

```mermaid
flowchart TB
    subgraph A [A. Platform and XR runtime - IWSDK]
        XR[XR adapter: session, visibility, player rig]
        IN[SDK input: hands, rays, poke]
        GR[SDK grab system]
        AU[SDK audio]
        AS[SDK assets and scene]
    end

    subgraph B [B. Input adapters]
        HA[Hand input adapter: grip hold, rail projection, loss grace]
        PA[Pointer adapter: beacons, seals, pins]
        LA[Lifecycle adapter]
        SA[Storage adapter]
    end

    subgraph D [D. Application systems]
        CQ[Command queue]
        DIR[Game Director: apply, fixed tick, drain]
        HOP[Hop Coordinator]
        EVT[Event dispatch and view]
    end

    subgraph C [C. Gameplay domain - pure TypeScript]
        SES[GameSession]
        SM[Seam manipulation]
        HG[HouseGraph and connection rules]
        COL[Collision and blocking]
        PZ[Puzzle engine and hints]
        SV[Surveyor director]
        NAV[Navigation: uniform-cost search]
        PG[Progression: game state, checkpoints, flags]
        CT[(Chapter content)]
    end

    subgraph E [E. Presentation]
        MV[Module view]
        GV[Grip and socket feedback]
        SVV[Surveyor view and animation]
        LV[Lamps, envelope, fade]
        AD[Audio director]
    end

    subgraph F [F. Persistence]
        CODEC[Save codec, validation, migration]
    end

    IN --> HA
    GR --> HA
    IN --> PA
    XR --> LA
    HA --> CQ
    PA --> CQ
    PA --> HOP
    LA --> CQ
    HOP --> CQ
    CQ --> DIR
    DIR --> SES
    SES --> SM --> HG
    SM --> COL
    HG --> PZ
    HG --> NAV --> SV
    PZ --> PG
    SV --> PG
    CT --> SES
    SES --> EVT
    EVT --> MV
    EVT --> GV
    EVT --> SVV
    EVT --> LV
    EVT --> AD
    AD --> AU
    MV --> AS
    HOP --> XR
    EVT --> CODEC
    CODEC --> SA
    SA --> DIR
```

Arrows show the direction of calls or data. No arrow leaves the domain toward any other layer: the domain is called, and answers with events and a view.

## 3. Interaction sequence: one seam move

Source: `technical-architecture.md` section 12; `domain-model.md` section 6.

```mermaid
sequenceDiagram
    autonumber
    actor Player
    participant SDK as IWSDK input and grab
    participant HA as Hand input adapter
    participant DIR as Game Director
    participant SM as Seam manipulation
    participant HG as HouseGraph
    participant PZ as Puzzle engine
    participant SV as Surveyor director
    participant PR as Presentation and audio

    Player->>SDK: pinch on the travel grip
    SDK-->>HA: Grabbed appears on the grip entity
    HA->>DIR: GripTake(grip, hand)
    DIR->>SM: apply
    alt latched, held by the Surveyor, or not at this station
        SM-->>DIR: refused(reason)
        DIR-->>PR: GripRefused: rattle, jitter, reason shown
    else accepted
        SM-->>DIR: GripTaken, dependent edges suspended
        DIR-->>PR: glow moves to the rail
    end

    loop every frame while held
        Player->>SDK: moves hand
        HA->>HA: project hand onto rail, get u
        HA->>DIR: GripDrag(grip, u)
        DIR->>SM: apply
        SM->>SM: clamp to limits and blocked stretches
        SM->>HG: which pairs would mate at the nearest detent?
        HG-->>SM: pairs
        SM-->>DIR: SeamPreview or SeamBlocked
        DIR-->>PR: move room toward param, ring of light or ash outline, grind
    end

    Player->>SDK: opens pinch, or tracking is lost past the grace
    SDK-->>HA: Grabbed disappears
    HA->>DIR: GripRelease(grip, reason)
    DIR->>SM: apply
    SM->>SM: inside a snap window and unblocked?
    alt snap
        SM-->>DIR: SeamReleased(snap, detent, ticks)
    else return
        SM-->>DIR: SeamReleased(return, committed, ticks)
    end
    DIR-->>PR: animate settle

    loop fixed ticks until settled
        DIR->>SM: tick
    end

    opt settled on a new detent
        SM->>HG: recompute graph from committed detents and flags
        HG-->>SM: new graph and diff
        SM-->>DIR: SeamCommitted, GraphChanged(opened, closed)
        SM->>PZ: evaluate objectives and checkpoints
        PZ-->>DIR: ObjectiveSolved, CheckpointReached, SaveRequested, VantagesChanged
        SM->>SV: fresh joints added, re-evaluate
        DIR->>SV: next tick
        SV->>HG: choose target, find route
        HG-->>SV: route
        SV-->>DIR: SurveyorStateChanged, SurveyorCount(n)
        DIR-->>PR: thud, ring holds, lamps change, postmark, the count
    end
```

## 4. Enemy decision sequence

Source: `01-game-design/enemy-surveyor.md`; `domain-model.md` section 7.

```mermaid
flowchart TD
    T([Tick]) --> X{Crossing a doorway?}
    X -- yes --> X1[Count down. On arrival: enter room, emit remaining count] --> END([End of tick])
    X -- no --> BR{Is its room being moved?}
    BR -- yes --> BR1[Brace, up to the limit] --> END
    BR -- no --> OBS[Observe: graph, player's room, fresh joints]
    OBS --> TG{Select target}
    TG -- newest reachable fresh joint --> J[Target: joint]
    TG -- else a route to the letter exists --> L[Target: letter]
    TG -- else --> N[No target]
    J --> PATH[Find route: uniform-cost search, fixed tie-break]
    L --> PATH
    PATH --> CMP{Compare with current plan}
    CMP -- next doorway no longer usable --> BLK[Blocked: walk to the brink, plumb line, wait]
    BLK --> RP
    CMP -- target or next doorway changed --> RP[Replanning: stand, ring sweeps, then emit the count]
    CMP -- unchanged --> ACT
    RP --> ACT{Act on plan}
    ACT -- joint --> INV[Investigating: walk the route; at the joint, measure]
    ACT -- letter, two or more doorways --> APP[Approaching]
    ACT -- letter, one doorway or same room --> HUN[Hunting: faster pace]
    N --> WHERE{In the Survey Office?}
    WHERE -- yes --> DOR[Dormant]
    WHERE -- no --> SEA[Searching: patrol reachable rooms]
    SEA -- 45 s and a route home --> RET[Retreating] --> DOR
    INV --> WALK
    APP --> WALK
    HUN --> WALK
    WALK{Walk time for this room spent and next doorway usable?}
    WALK -- yes --> CR[Begin crossing: seams of this doorway are held]
    WALK -- no --> WAIT[Keep walking, or wait at a suspended doorway]
    CR --> CATCH
    WAIT --> CATCH
    DOR --> END
    CATCH{In the player's room for its reach time?}
    CATCH -- yes --> CAUGHT[PlayerCaught: failure recovery]
    CATCH -- no --> END
    CAUGHT --> END
```

Surveyor states only:

```mermaid
stateDiagram-v2
    [*] --> Dormant
    Dormant --> Listening: armed and a target exists
    Listening --> Replanning: wake delay over
    Replanning --> Investigating: joint target
    Replanning --> Approaching: letter, 2+ doorways
    Replanning --> Hunting: letter, 0 or 1 doorway
    Replanning --> Searching: no target, away from office
    Replanning --> Dormant: no target, in office
    Investigating --> Replanning: measured, or joint gone
    Investigating --> Blocked: next doorway gone
    Approaching --> Hunting: one doorway left
    Approaching --> Blocked: next doorway gone
    Approaching --> Replanning: reachable fresh joint
    Hunting --> Approaching: route grows to 2+
    Hunting --> Blocked: next doorway gone
    Hunting --> Replanning: reachable fresh joint
    Blocked --> Replanning: block time over
    Searching --> Replanning: target appears
    Searching --> Retreating: 45 s, route home exists
    Retreating --> Dormant: arrives
    Retreating --> Replanning: target appears
```

## 5. Game-state machine

Source: `runtime-lifecycle.md` section 3.

```mermaid
stateDiagram-v2
    [*] --> Boot
    Boot --> Title: assets loaded, save examined
    Boot --> ErrorPage: WebXR unsupported or critical asset failed
    ErrorPage --> Boot: retry

    Title --> ChapterIntro: Begin(new) or Begin(continue)
    ChapterIntro --> Exploration: fade-in complete

    state Playing {
        Exploration --> PuzzleActive: at a station with an unsolved objective
        PuzzleActive --> Exploration: objective solved, or hopped away
        Exploration --> SeamInteraction: a seam leaves rest
        PuzzleActive --> SeamInteraction: a seam leaves rest
        ThreatEncounter --> SeamInteraction: a seam leaves rest
        SeamInteraction --> Exploration: all seams at rest (returns to origin state)
        SeamInteraction --> PuzzleActive: all seams at rest (returns to origin state)
        SeamInteraction --> ThreatEncounter: all seams at rest (returns to origin state)
        Exploration --> ThreatEncounter: Surveyor leaves Dormant with a route to the player
        PuzzleActive --> ThreatEncounter: Surveyor leaves Dormant with a route to the player
        ThreatEncounter --> Exploration: Surveyor Dormant, or sealed with no route
        Exploration --> Checkpoint: checkpoint trigger first holds
        PuzzleActive --> Checkpoint: checkpoint trigger first holds
        ThreatEncounter --> Checkpoint: checkpoint trigger first holds
        Checkpoint --> Exploration: save requested (same tick)
    }

    Playing --> Pause: session not visible
    Pause --> Playing: session visible (returns to the state it left)
    Pause --> Title: session ended

    Playing --> FailureRecovery: PlayerCaught (from ThreatEncounter or SeamInteraction)
    FailureRecovery --> ChapterIntro: checkpoint snapshot restored

    Playing --> ChapterComplete: letter delivered and ending finished
    ChapterComplete --> ChapterIntro: begin again
    ChapterComplete --> [*]: leave (exit XR)

    Playing --> ChapterIntro: Restart from the envelope
    Playing --> ErrorState: uncaught error
    ErrorState --> Title: restart from the error card
```

Failure conditions and their recovery routes: unsupported platform and failed critical load go to the error page with retry; a caught player goes through FailureRecovery to the last checkpoint; a lost session goes through Pause to Title and resumes from the last checkpoint; an uncaught error goes to the error card and restarts; a rejected save is handled before Title by the recovery ladder in `save-schema.md`.

## 6. Deployment architecture

Source: `build-architecture.md`.

```mermaid
flowchart LR
    subgraph Dev [Developer machine]
        SRC[Source, scene, assets]
        TESTS[Unit and model tests - Node]
        DEVS[IWSDK dev server with IWER emulation - desktop browser]
        RT[Runtime tests - SDK CLI driving IWER]
        BUILD[vite build]
    end

    subgraph Out [Build output]
        DIST[dist/: index.html, hashed scripts, scene JSON, KTX2 textures, glTF, audio]
    end

    subgraph Host [Static HTTPS hosting]
        CDN[Static files with cache headers and a content security policy]
    end

    subgraph Quest [Meta Quest headset]
        QB[Quest Browser]
        PAGE[Page: load, Enter VR]
        XRS[WebXR immersive-vr session with hand tracking]
        RUN[IWSDK runtime and Room Zero]
        LS[(Local storage: save)]
    end

    SRC --> TESTS
    SRC --> DEVS --> RT
    SRC --> BUILD --> DIST --> CDN
    CDN -- HTTPS --> QB --> PAGE --> XRS --> RUN
    RUN <--> LS
    DEVS -. same HTTPS dev URL over Wi-Fi or USB port forwarding, for headset smoke tests .-> QB
```

IWER is a development and test environment. It emulates the WebXR device in a desktop browser and is not a substitute for a physical headset: it does not reproduce tracking quality, comfort, display characteristics or device performance. Validation on hardware is a separate gate (`05-quality/test-strategy.md` section 8).

## 7. Save recovery

See `save-schema.md` section 5.

## 8. Player flow

See `02-experience-design/ux-flow.md` section 1.
