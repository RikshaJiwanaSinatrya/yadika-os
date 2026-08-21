import { Window } from './Window';
import { useWindowStore } from '../../store/windowStore';

/**
 * Renders every window that lives in the store. It never needs to change
 * when new apps are added — the app registry decides what is inside a window.
 */
export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);

  return (
    <>
      {Object.values(windows).map((win) => (
        <Window key={win.id} win={win} />
      ))}
    </>
  );
}
