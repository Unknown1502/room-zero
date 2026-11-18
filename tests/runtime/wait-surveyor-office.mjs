/** Read-only wait for the live Surveyor to complete a real doorway crossing into the office. */
export default async function waitSurveyorOffice({ frame }) {
  return frame.evaluate(async () => {
    const game = globalThis.__rz;
    if (!game) throw new Error('Room Zero development hook is unavailable');
    const started = performance.now();
    while (performance.now() - started < 50000) {
      const surveyor = game.session.surveyor;
      if (surveyor.room === 'dead-letter' && !surveyor.crossing) {
        return {
          entered: true,
          elapsedMs: performance.now() - started,
          surveyor: {
            room: surveyor.room,
            state: surveyor.state,
            crossing: surveyor.crossing,
            route: [...surveyor.route],
            measuring: surveyor.measuring,
            stateTicks: surveyor.stateTicks,
            fresh: [...surveyor.fresh],
          },
        };
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const surveyor = game.session.surveyor;
    return {
      entered: false,
      elapsedMs: performance.now() - started,
      surveyor: {
        room: surveyor.room,
        state: surveyor.state,
        crossing: surveyor.crossing,
        route: [...surveyor.route],
        measuring: surveyor.measuring,
        stateTicks: surveyor.stateTicks,
        fresh: [...surveyor.fresh],
      },
    };
  });
}
