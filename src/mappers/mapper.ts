import { CPU } from "../cpu";
import { PPU } from "../ppu";
import { ROM } from "../rom";

export abstract class Mapper {    
    protected rom: ROM;
    
    constructor(rom: ROM) {
        this.rom = rom;        
    };
    abstract write(addr: number, val: number): void;
    abstract read(add: number, poke: boolean): number;
    abstract step(): void;
}