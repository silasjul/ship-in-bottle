import { button, useControls } from 'leva';
import { useLevaStore } from '@/stores/levaStore';

export function useLogButton() {
  useControls({
    Log: button(() => {
      const values = Object.fromEntries(
        Object.entries(useLevaStore.getState()).filter(([, value]) => typeof value !== 'function')
      );

      console.log(values);
    }),
  });
}
