import { NES } from './nes';
import { BUTTON, BUTTONS } from './controller';

// const path = './roms/official/DonkeyKong.nes';
// const path = './roms/official/bomberman.nes';
// const path = './roms/official/BalloonFight.nes';
const path = './roms/official/Lode Runner (USA).nes';
// const path = './roms/official/Lode Runner (Japan).nes';

// const path = './roms/official/ic.nes'; 
// const path = './roms/official/smb.nes';
// const path = './roms/official/Pinball.nes';

let nes = new NES(
    document.getElementById('canvas') as HTMLCanvasElement,
    document.getElementById('spritesDebugCanvas') as HTMLCanvasElement);

let buttons: BUTTONS = {};
buttons[BUTTON.A] = false;
buttons[BUTTON.B] = false;
buttons[BUTTON.Select] = false;
buttons[BUTTON.Start] = false;
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
        console.log(`Pressed "${BUTTON[buttonActionMap[event.key]]}"`);
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
    console.log("ROM Loaded"); 
    nes.run();
});