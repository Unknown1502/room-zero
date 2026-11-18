// Entry point: create the IWSDK world from the project manifest, build the game, register systems.
// IWSDK owns the render loop and the XR session; nothing here starts a loop of its own.
import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { Game } from './app/game.js';
import { chapterOne } from './content/chapter-one.js';
import type { Settings } from './domain/types.js';
import type { Storage } from './persistence/save.js';
import { GameDirectorSystem, HandInputSystem, LifecycleSystem, PointerInputSystem, PresentationSystem } from './systems/systems.js';

const $ = (id: string) => document.getElementById(id)!;
const status = (text: string) => { $('status').textContent = text; };

const storage: Storage = {
  get: (k) => window.localStorage.getItem(k),
  set: (k, v) => window.localStorage.setItem(k, v),
  remove: (k) => window.localStorage.removeItem(k),
};

async function main(): Promise<void> {
  const xr = (navigator as Navigator & { xr?: { isSessionSupported(mode: string): Promise<boolean> } }).xr;
  const supported = !!xr && (await xr.isSessionSupported('immersive-vr').catch(() => false));
  const world = await World.create($('scene-container') as HTMLDivElement, projectOptions);
  const game = new Game(world, chapterOne, storage);
  (world.globals as Record<string, unknown>).game = game;
  world
    .registerSystem(HandInputSystem, { priority: 0 })
    .registerSystem(PointerInputSystem, { priority: 1 })
    .registerSystem(LifecycleSystem, { priority: 2 })
    .registerSystem(GameDirectorSystem, { priority: 10 })
    .registerSystem(PresentationSystem, { priority: 20 });

  // The web page: the only conventional interface. Settings are here as well as in the world (accessibility.md).
  const enter = $('enter') as HTMLButtonElement;
  const ready = 'Seated. Hands only. About seven minutes. Headphones recommended.';
  if (supported && xr) {
    enter.disabled = false;
    status(ready);
    // REQ-ERR-002: if the headset refuses or fails to start the session, say so and allow another attempt.
    // The wrapper looks the real method up at call time, so it sits in front of whatever the platform provides.
    const sys = xr as unknown as { requestSession(mode: string, init?: unknown): Promise<unknown> };
    const proto = Object.getPrototypeOf(sys) as { requestSession(mode: string, init?: unknown): Promise<unknown> };
    sys.requestSession = (mode, init) => proto.requestSession.call(sys, mode, init).catch((e: unknown) => {
      status('The headset did not start VR. Try again.');
      enter.disabled = false;
      throw e;
    });
    enter.addEventListener('click', () => { enter.disabled = true; status('Starting VR.'); game.startAudio(); world.launchXR(); });
  } else {
    status('This needs a VR headset browser. Open this address in the Meta Quest Browser.');
  }
  const apply = () => game.command({ type: 'SetSettings', settings: {
    intensity: ($('intensity') as HTMLSelectElement).value as Settings['intensity'],
    hands: ($('hands') as HTMLSelectElement).value as Settings['hands'],
    snapTurn: Number(($('turn') as HTMLSelectElement).value) as Settings['snapTurn'],
    volume: Number(($('volume') as HTMLInputElement).value),
  } });
  ($('intensity') as HTMLSelectElement).value = game.session.settings.intensity;
  ($('hands') as HTMLSelectElement).value = game.session.settings.hands;
  ($('turn') as HTMLSelectElement).value = String(game.session.settings.snapTurn);
  ($('volume') as HTMLInputElement).value = String(game.session.settings.volume);
  for (const id of ['intensity', 'hands', 'turn', 'volume']) $(id).addEventListener('change', apply);
  $('restart').addEventListener('click', () => { game.restart(); });
  if (game.notice) $('notice').textContent = 'Earlier progress could not be restored as saved.';
  world.visibilityState.subscribe((v) => {
    $('page').style.display = v === 'non-immersive' ? 'flex' : 'none';
    if (v === 'non-immersive' && supported) { enter.disabled = false; status(ready); } // back from VR: enter again
  });

  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__rz = game; // development and runtime tests only
}

main().catch((err) => {
  console.error(err);
  status(`The house could not be prepared: ${err instanceof Error ? err.message : String(err)}`);
  $('retry').style.display = 'inline-block';
});
