/** Read-only inspection of the current live IWER game state. */
export default async function liveState({ frame }) {
  return frame.evaluate(async () => {
    const game = globalThis.__rz;
    if (!game) throw new Error('Room Zero development hook is unavailable');
    const { HandInputSystem, PointerInputSystem } = await import('/src/systems/systems.ts');
    const handInput = game.world.getSystem(HandInputSystem);
    const pointerInput = game.world.getSystem(PointerInputSystem);
    return {
      xrActive: !!game.world.session,
      game: game.session.game,
      fade: game.fade,
      vantage: game.session.vantage,
      reachable: game.session.reachable(),
      checkpoint: game.session.checkpoint,
      catches: game.session.catches,
      canContinue: game.session.canContinue(),
      complete: game.session.complete,
      postmarks: [...game.session.postmarks],
      solved: [...game.session.solved],
      flags: { ...game.session.flags },
      gripRefusals: Object.fromEntries(Object.keys(game.session.seams).map((seam) => [seam, game.session.gripRefusal(seam)])),
      jitter: Object.fromEntries(game.jitter),
      seams: Object.fromEntries(Object.entries(game.session.seams).map(([id, state]) => [id, { param: state.param, committed: state.committed, phase: state.phase, travelHand: state.travelHand, anchorHand: state.anchorHand }])),
      movingModules: Object.fromEntries(['stair', 'landing', 'turn', 'bridge', 'lift', 'zero'].map((id) => {
        const module = game.built.modules.get(id);
        return [id, { position: module.position.toArray(), yaw: module.rotation.y }];
      })),
      surveyor: {
        room: game.session.surveyor.room,
        state: game.session.surveyor.state,
        target: game.session.surveyor.target,
        crossing: game.session.surveyor.crossing,
        route: [...game.session.surveyor.route],
        armed: game.session.surveyor.armed,
        measuring: game.session.surveyor.measuring,
        stateTicks: game.session.surveyor.stateTicks,
        walk: game.session.surveyor.walk,
        fresh: [...game.session.surveyor.fresh],
        inPlayerRoom: game.session.surveyor.inPlayerRoom,
        idle: game.session.surveyor.idle,
        brace: game.session.surveyor.brace,
      },
      settings: { ...game.session.settings },
      sessionTicks: game.session.tickCount,
      handsPromptVisible: game.handsCard.visible,
      pointerRestartHold: pointerInput.restartHold,
      pointerContacts: [...pointerInput.contacts],
      gameplayHands: handInput.hands.map((hand) => ({ tracked: hand.tracked, pinch: hand.pinch, hold: hand.hold, lost: hand.lost })),
      performance: {
        ...game.stats,
        renderer: game.world.renderer?.info ? {
          calls: game.world.renderer.info.render.calls,
          triangles: game.world.renderer.info.render.triangles,
          geometries: game.world.renderer.info.memory.geometries,
          textures: game.world.renderer.info.memory.textures,
          programs: game.world.renderer.info.programs?.length,
        } : undefined,
        heapBytes: performance.memory?.usedJSHeapSize,
      },
      failed: game.failed,
      controls: [...game.seals].map(([action, seal]) => ({ action, visible: seal.mesh.visible, position: seal.mesh.getWorldPosition(seal.mesh.position.clone()).toArray() })),
      letterVisible: game.letter.visible,
      letterState: game.session.letter,
      letterHand: game.letterHand,
      letterPosition: game.letter.getWorldPosition(game.world.player.position.clone()).toArray(),
      pigeonholePosition: game.built.pigeonhole.getWorldPosition(game.world.player.position.clone()).toArray(),
      ending: game.session.ending ? { ...game.session.ending } : undefined,
      settingsSeals: [...game.settingSeals].map(([action, seal]) => ({ action, visible: seal.visible, position: seal.getWorldPosition(seal.position.clone()).toArray() })),
      beacons: [...game.beacons].map(([id, beacon]) => ({
        id,
        target: `entity-${beacon.entity.index}`,
        visible: beacon.group.visible,
        interactionTags: beacon.entity.getComponents().map((component) => component.id).filter((id) => id === 'Hovered' || id === 'Pressed'),
        position: beacon.group.getWorldPosition(game.world.player.position.clone()).toArray(),
      })),
      player: {
        position: game.world.player.getWorldPosition(game.world.player.position.clone()).toArray(),
        head: game.world.player.head.getWorldPosition(game.world.player.position.clone()).toArray(),
        rotationY: game.world.player.rotation.y,
      },
      stations: game.stations.filter((station) => station.spec.vantage === game.session.vantage).map((station) => ({
        seam: station.spec.seam,
        spec: station.spec,
        travel: station.travel.getWorldPosition(station.travel.position.clone()).toArray(),
        anchor: station.anchor?.getWorldPosition(station.anchor.position.clone()).toArray(),
        pin: station.pin?.getWorldPosition(station.pin.position.clone()).toArray(),
      })),
      leftHandSource: !!game.world.input.xr.getPrimaryInputSource('left'),
      rightHandSource: !!game.world.input.xr.getPrimaryInputSource('right'),
      trackedHands: ['left', 'right'].map((side) => ({
        side,
        tracked: !!game.world.input.xr.getPrimaryInputSource(side),
        isHand: game.world.input.xr.isPrimary('hand', side),
        position: game.world.player.indexTipSpaces[side].getWorldPosition(game.world.player.position.clone()).toArray(),
        pinch: game.world.input.xr.getSelectState(side).active,
        settingSealDistances: Object.fromEntries([...game.settingSeals].map(([name, seal]) => {
          const tip = game.world.player.indexTipSpaces[side].getWorldPosition(game.world.player.position.clone());
          const target = seal.getWorldPosition(seal.position.clone());
          return [name, tip.distanceTo(target)];
        })),
      })),
    };
  });
}
