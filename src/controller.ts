export enum BUTTON {
    A        = 0,
    B        = 1,
    Select   = 2,
    Start    = 3,
    Up       = 4,
    Down     = 5,
    Left     = 6,
    Right    = 7
};

export type BUTTONS = {[index:number]: boolean };

export class Controller {
    private buttons: BUTTONS = {};
    private strobe: number = 0;
    private index: number = 0;

    constructor() {        
    }

    write(value: number) {
        this.strobe = value;
        if ((this.strobe & 1) == 1)
            this.index = 0;
    }

    // some games depend on the read state, like paper boy - todo: exact bits need to be matched
    read(): number {
        let button: number = 0;

        if ((this.index < 8 && this.buttons[this.index]) || this.index >= 8)
            button = 1;        

        this.index++;

        if ((this.strobe & 1) == 1) {
            this.index = 0;
        }
    
        return button;
    }

    setButtons(buttons: BUTTONS) {
        this.buttons = buttons;
    }
}
