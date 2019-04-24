import { Mapper } from './mapper';

export class Mapper0 extends Mapper {
    chrroms: any[];

    read(addr: number, poke: boolean) {
        // console.log('r', addr.toString(16));
        return this.rom.getCHRROMS()[0][addr] & 0xFF;  
    }

    write(addr: number, val: number) {
    // case address < 0x2000:
	// 	m.CHR[address] = value
	// case address >= 0x8000:
	// 	m.prgBank1 = int(value) % m.prgBanks
	// case address >= 0x6000:
	// 	index := int(address) - 0x6000
	// 	m.SRAM[index] = value        
    }

    step(): void {

    }
}