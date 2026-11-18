// Component declarations. No system, DOM or renderer imports here: the editor loads this module too.
import { Types, createComponent } from '@iwsdk/core';

/** A signal lamp that marks a vantage. The domain ID is the join key to the chapter content. */
export const Beacon = createComponent('Beacon', { vantage: { type: Types.String, default: '' } });

/** A wax seal the player presses: begin, continue, again, leave. */
export const Seal = createComponent('Seal', { action: { type: Types.String, default: '' } });
