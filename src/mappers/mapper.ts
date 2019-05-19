import { CPU } from "../cpu";
import { PPU } from "../ppu";
import { ROM } from "../rom";

export abstract class Mapper {    
    protected rom: ROM;
    protected PRGROM: Uint8Array;
    protected CHRROM: Uint8Array;
    protected prgBanksCnt: number;

    constructor(rom: ROM) {
        this.rom = rom;     
        this.PRGROM = this.rom.getPRG();   
        this.CHRROM = this.rom.getCHRROMS()[0]; // todo todo todo todo! same as PRG??

        this.prgBanksCnt = this.PRGROM.length / 0x4000;
    };
    abstract write(addr: number, val: number): void;
    abstract read(add: number, poke: boolean): number;
    abstract step(): void;
}