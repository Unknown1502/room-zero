/** M5 live check: comfort controls, full chapter presentation, and in-world error recovery. */
export default async function m5Gate({ frame }) {
  return frame.evaluate(async () => {
    const fail = (message) => { throw new Error(`M5 runtime gate: ${message}`); };
    const near = (a, b, eps = 0.002) => a.distanceTo(b) <= eps;
    const game = globalThis.__rz;
    if (!game) fail('Room Zero development hook is unavailable');
    if (!game.world.session) fail('Enter immersive IWER before running the M5 gate');

    const { replayReference } = await import('/src/domain/reference.ts');
    const { HandInputSystem, PointerInputSystem } = await import('/src/systems/systems.ts');
    const pointer = game.world.getSystem(PointerInputSystem);
    const handInput = game.world.getSystem(HandInputSystem);
    if (!pointer || !handInput) fail('input systems are not registered');
    const xrInput = game.world.input.xr;
    if (!xrInput.getPrimaryInputSource('left') || !xrInput.getPrimaryInputSource('right')) fail('IWER did not provide both hand input sources');
    if (game.turnMarkers.size !== 2 || game.settingSeals.size !== 4) fail('comfort controls are missing from the scene');

    game.restart();
    game.step(0);
    game.view(2.1, []);
    game.command({ type: 'EndSession' });
    game.step(0);
    game.view(1 / 72, []);
    if (game.failed || game.session.game !== 'Title') fail('could not prepare a clean title state for the M5 gate');

    const hand = handInput.hands[0];
    const touch = (object) => {
      object.getWorldPosition(hand.pos);
      hand.tracked = true;
      pointer.update(1 / 72);
    };
    const leave = () => {
      hand.pos.set(1000, 1000, 1000);
      pointer.update(1 / 72);
    };
    const checks = [];

    game.view(1 / 72, []);
    const snapBefore = game.session.settings.snapTurn;
    touch(game.settingSeals.get('turn'));
    if (game.session.settings.snapTurn !== (snapBefore === 0 ? 30 : snapBefore === 30 ? 45 : 0)) fail('turn seal did not cycle its setting');
    leave();
    const intensityBefore = game.session.settings.intensity;
    touch(game.settingSeals.get('intensity'));
    if (game.session.settings.intensity === intensityBefore) fail('intensity seal did not change the setting');
    leave();
    const handsBefore = game.session.settings.hands;
    touch(game.settingSeals.get('hands'));
    if (game.session.settings.hands === handsBefore) fail('hands seal did not change the setting');
    leave();
    checks.push('IWER provides both hand sources; three envelope settings respond to fingertip contact');

    game.pressSeal('begin');
    game.step(0);
    game.view(2.1, []);
    if (!game.session.playing()) fail('begin seal did not enter the playable chapter');
    checks.push('two-second restart seal returns to the opening');

    game.command({ type: 'SetSettings', settings: { snapTurn: 30, intensity: 'standard', hands: 'two' } });
    game.step(0);
    game.view(1 / 72, []);
    const headBefore = game.world.player.head.getWorldPosition(new game.world.player.position.constructor());
    const orientationBefore = game.world.player.head.getWorldQuaternion(new game.world.player.quaternion.constructor());
    touch(game.turnMarkers.get('left'));
    if (game.pending?.kind !== 'turn') {
      const markerPosition = game.turnMarkers.get('left').getWorldPosition(new game.world.player.position.constructor());
      fail(`left marker did not request a snap turn (game=${game.session.game}, snap=${game.session.settings.snapTurn}, fade=${game.fade}, pending=${JSON.stringify(game.pending)}, tracked=${hand.tracked}, distance=${hand.pos.distanceTo(markerPosition).toFixed(4)}, marker=${game.turnMarkers.get('left').visible})`);
    }
    pointer.update(1 / 72);
    if (game.pending?.kind !== 'turn') fail('held marker lost its pending turn');
    game.view(0.05, []);
    const headAfter = game.world.player.head.getWorldPosition(new game.world.player.position.constructor());
    const orientationAfter = game.world.player.head.getWorldQuaternion(new game.world.player.quaternion.constructor());
    if (!near(headBefore, headAfter)) fail(`snap turn shifted the head by ${headBefore.distanceTo(headAfter).toFixed(4)} m`);
    const expected = new orientationBefore.constructor().setFromAxisAngle(new headAfter.constructor(0, 1, 0), Math.PI / 6).multiply(orientationBefore);
    if (Math.abs(orientationAfter.dot(expected)) < 0.999) fail('left marker did not rotate the head by 30 degrees');
    game.view(0.05, []);
    leave();
    game.command({ type: 'SetSettings', settings: { snapTurn: 45 } });
    game.step(0);
    game.view(1 / 72, []);
    const rightHeadBefore = game.world.player.head.getWorldPosition(new game.world.player.position.constructor());
    const rightOrientationBefore = game.world.player.head.getWorldQuaternion(new game.world.player.quaternion.constructor());
    touch(game.turnMarkers.get('right'));
    if (game.pending?.kind !== 'turn') fail('right marker did not request a snap turn');
    game.view(0.05, []);
    const rightHeadAfter = game.world.player.head.getWorldPosition(new game.world.player.position.constructor());
    const rightOrientationAfter = game.world.player.head.getWorldQuaternion(new game.world.player.quaternion.constructor());
    if (!near(rightHeadBefore, rightHeadAfter)) fail('right snap turn shifted the head position');
    const expectedRight = new rightOrientationBefore.constructor().setFromAxisAngle(new rightHeadAfter.constructor(0, 1, 0), -Math.PI / 4).multiply(rightOrientationBefore);
    if (Math.abs(rightOrientationAfter.dot(expectedRight)) < 0.999) fail('right marker did not rotate the head by 45 degrees');
    game.view(0.05, []);
    leave();
    hand.tracked = false;
    const settingsAtRestart = { ...game.session.settings };
    game.command({ type: 'Hop', vantage: 'v-foyer-door' });
    game.placeRig();
    game.view(1 / 72, []);
    touch(game.settingSeals.get('restart'));
    pointer.update(2.05);
    if (game.failed || game.session.game !== 'ChapterIntro') fail('two-second restart seal did not reset the chapter mid-play');
    if (game.session.settings.snapTurn !== settingsAtRestart.snapTurn || game.session.settings.intensity !== settingsAtRestart.intensity || game.session.settings.hands !== settingsAtRestart.hands) fail('chapter restart did not preserve accessibility settings');
    game.step(0);
    game.view(2.1, []);
    if (!game.session.playing()) fail('restart did not return to playable chapter state');
    checks[1] = 'two-second restart seal returns a mid-chapter run to the opening';
    checks.push('30 and 45 degree snap turns preserve the tracked head position');

    // Exercise the full authored solution against the same GameSession used by the live scene.
    game.restart();
    game.step(0);
    game.view(2.1, []);
    replayReference(game.session, 'complete');
    game.step(0);
    game.view(1 / 72, []);
    const expectedSolved = ['obj-bridge', 'obj-first-seam', 'obj-room-zero', 'obj-staircase', 'obj-wrong-door'];
    if (game.failed) fail('runtime entered its error boundary during the chapter replay');
    if (game.session.game !== 'ChapterComplete' || !game.session.complete) fail(`reference route ended in ${game.session.game}`);
    if (game.session.postmarks.join('|') !== 'ENTRANCE|STAIR|LANDING|WEST|EAST|LAST POST') fail('postmarks did not arrive in order');
    if (expectedSolved.some((id) => !game.session.solved.has(id))) fail('one or more chapter objectives did not solve');
    if (game.session.solved.size !== expectedSolved.length || game.session.surveyor.room !== 'lift') fail('chapter ended without all five objectives or the Surveyor at the lift');
    if (!game.built.card.visible || !game.built.titleCard.visible) fail('ending cards did not reach the scene');
    const fullChapter = {
      state: game.session.game,
      complete: game.session.complete,
      objectiveCount: game.session.solved.size,
      postmarks: [...game.session.postmarks],
      surveyorRoom: game.session.surveyor.room,
    };
    checks.push('reference route reaches Room Zero, solves all objectives, and renders the ending');

    const tickBefore = game.session.tickCount;
    game.fail(new Error('M5 recovery fixture'));
    game.step(0.25);
    game.view(0.15, []);
    if (!game.errorCard.visible || game.session.tickCount !== tickBefore) fail('error card was absent or simulation kept ticking');
    const retryVisible = game.errorRetry.visible && game.errorRetry.parent.visible;
    touch(game.errorRetry);
    if (game.failed || game.session.game !== 'ChapterIntro' || game.errorCard.visible) fail(`in-world error retry did not restart the chapter (failed=${game.failed}, game=${game.session.game}, card=${game.errorCard.visible}, retryVisible=${retryVisible}, tracked=${hand.tracked})`);
    checks.push('error boundary stops ticks and the in-world retry returns to the opening');

    hand.tracked = false;
    return {
      runtime: 'IWSDK 1.1.0 / active IWER session',
      checks,
      errorRetryVisible: retryVisible,
      fullChapter,
      stateAfterRecovery: game.session.game,
      checkpointAfterRecovery: game.session.checkpoint,
    };
  });
}
