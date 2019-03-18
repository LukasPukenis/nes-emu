import { NES } from './nes';

console.log('yey')
// // const path = './roms/DonkeyKong.nes';
const path = './roms/bkg.nes';
// // const path = './roms/ppu/01-vbl_basics.nes';
// // const path = './roms/nestest.nes';

let nes = new NES(document.getElementById('canvas') as HTMLCanvasElement);
nes.load(path).then(() => {    
    nes.run();
});