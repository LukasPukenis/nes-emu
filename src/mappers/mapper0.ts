import { Mapper } from './mapper';

export class Mapper0 extends Mapper {
    chrroms: any[];

    read(addr: number) {        
        return this.rom.getCHRROMS()[0][addr] & 0xFF;        
    }

    write(addr: number, val: number) {

    }

    step(): void {

    }
}