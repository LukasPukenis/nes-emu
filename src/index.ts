import { NES } from './nes';
import { BUTTON, BUTTONS } from './controller';

console.log('yey')
// const path = './roms/official/DonkeyKong.nes';
const path = './roms/official/BalloonFight.nes';
// const path = './roms/bkg.nes';
// // const path = './roms/ppu/01-vbl_basics.nes';
// // const path = './roms/nestest.nes';

let nes = new NES(document.getElementById('canvas') as HTMLCanvasElement);

let buttons: BUTTONS = {};
buttons[BUTTON.A] = false;
buttons[BUTTON.B] = false;
buttons[BUTTON.Start] = false;
buttons[BUTTON.Select] = false;
buttons[BUTTON.Up] = false;
buttons[BUTTON.Down] = false;
buttons[BUTTON.Left] = false;
buttons[BUTTON.Right] = false;    

const buttonActionMap: { [key in string]: BUTTON} = {
    'ArrowUp': BUTTON.Up,
    'ArrowDown': BUTTON.Down,
    'ArrowLeft': BUTTON.Left,
    'ArrowRight': BUTTON.Right,
    'z': BUTTON.A,
    'x': BUTTON.B,
    'a': BUTTON.Start,
    's': BUTTON.Select
}

window.addEventListener("keydown", function(event) {
    if (event.key in buttonActionMap) {
        buttons[buttonActionMap[event.key]] = true;
        nes.getController1().setButtons(buttons);
    }    
    
    event.preventDefault();
});

window.addEventListener("keyup", function(event) {
    if (event.key in buttonActionMap) {
        buttons[buttonActionMap[event.key]] = false;
        nes.getController1().setButtons(buttons);
    }    
    
    event.preventDefault();
});

// @ts-ignore
window.nes = nes;

nes.load(path).then(() => {    
    nes.run();
});