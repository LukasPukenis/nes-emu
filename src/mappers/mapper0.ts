import { Mapper } from './mapper';
import { NES } from '../nes';

export class Mapper0 extends Mapper {
    chrroms: any[];
    nes: NES;

    read(addr: number, poke: boolean) {
        const prgBank1 = 0;
        const prgBank2 = this.prgBanksCnt - 1;
    
        if (addr < 0x2000) {
            return this.CHRROM[addr];
        } else if (addr >= 0xC000) {
            const index = prgBank2*0x4000 + (addr-0xC000)
            return this.PRGROM[index];
        } else if (addr >= 0x8000) {
            const index = prgBank1 * 0x4000 + (addr-0x8000)
            return this.PRGROM[index];         
        } else if (addr >= 0x6000) {
            // console.log("NOT IMPLEMENTED1", addr.toString(16))
            return 0;
        } else {
            // console.log("NOT IMPLEMENTED2", addr.toString(16))
            return 0;
        }        
    }

    write(addr: number, val: number) {
    // case address < 0x2000:
	// 	m.CHR[address] = value
	// case address >= 0x8000:
	// 	m.prgBank1 = int(value) % m.prgBanks
	// case address >= 0x6000:
	// 	index := int(address) - 0x6000
	// 	m.SRAM[index] = val   ue        
    }

    step(): void {

    }
}