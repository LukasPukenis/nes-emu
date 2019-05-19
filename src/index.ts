import { NES } from './nes';
import { BUTTON, BUTTONS } from './controller';

// const path = './roms/official/DonkeyKong.nes'; // mirror: 0
// const path = './roms/official/bomberman.nes'; // mirror: 0
// const path = './roms/official/BalloonFight.nes'; // mirror: 0
// const path = './roms/official/LodeRunner.nes'; // mirror: 0
// const path = './roms/official/ic.nes'; // mirror: 1
// const path = './roms/official/Pinball.nes'; // mirror: 0

// const path = './roms/vram_access.nes'; // PASSES OK
// const path = './roms/vbl_clear_time.nes'; // PASSES OK
// const path = './roms/official_only.nes'; // PASSES OK


// const path = './roms/instr_test/rom_singles/01-basics.nes';
const path = './roms/instr_test/rom_singles/02-implied.nes'; // fail
// const path = './roms/instr_test/rom_singles/03-immediate.nes'; // fail
// const path = './roms/instr_test/rom_singles/04-zero_page.nes'; // fail
// const path = './roms/instr_test/rom_singles/05-zp_xy.nes'; // fail
// const path = './roms/instr_test/rom_singles/06-absolute.nes';
// const path = './roms/instr_test/rom_singles/07-abs_xy.nes';
// const path = './roms/instr_test/rom_singles/08-ind_x.nes';
// const path = './roms/instr_test/rom_singles/09-ind_y.nes';
// const path = './roms/instr_test/rom_singles/10-branches.nes';
// const path = './roms/instr_test/rom_singles/11-stack.nes';
// const path = './roms/instr_test/rom_singles/12-jmp_jsr.nes';
// const path = './roms/instr_test/rom_singles/13-rts.nes';
// const path = './roms/instr_test/rom_singles/14-rti.nes';
// const path = './roms/instr_test/rom_singles/15-brk.nes';
// const path = './roms/instr_test/rom_singles/16-special.nes';

// const path = './roms/official/nestestcart.nes';


// const path = './tests/nestest/nestest.nes';

// @ts-ignore
window.mmm = [];
// @ts-ignore
window.DEBUG_CPU = true;

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