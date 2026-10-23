import { createContext } from 'react';
import type { SessionView } from '../../../packages/contracts/src/index.js';
export const Auth = createContext<SessionView | null>(null);
