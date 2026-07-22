import { button, useControls } from 'leva';
import { cameraState } from '@/lib/cameraState';

const round = (v: number) => Math.round(v * 100) / 100;

export function useCameraButton() {
  useControls({
    'Log camera': button(() => {
      const { position, target } = cameraState;
      console.log('camera', {
        position: [round(position.x), round(position.y), round(position.z)],
        target: [round(target.x), round(target.y), round(target.z)],
      });
    }),
  });
}
