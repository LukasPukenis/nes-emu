import { NES } from "./nes";

/**
 * Abbreviations used:
 * OAM - Object Attribute Memory, 64 entries, 4 bytes each
 */

class Status {
    blank: boolean;

    getByte(): number {
        let byte = 0;
        byte |= Number(this.blank) << 7;

        return byte;
    }
}

export class PPU {
    nes: NES;
    vram: Uint8Array;
    writeToggle: boolean;
    address: number;
    tempAddrToWrite: number;
    bufferedReadValue: number;
    status: Status;
    
    constructor(nes: NES) {
        this.nes = nes;
        this.vram = new Uint8Array(8*1024);
        this.status = new Status();
    }

    step() {
        
    }

    readStatus(): number {
        let status = this.status.getByte();
        this.status.blank = false;  // reading clears vblank bit
        return status;
    }    

    write(addr: number, value: number): void {
        if (addr == 0x2000) {
            this.writeControl(value);
        } else if (addr == 0x2001) {
            this.writeMask(value);
        } else if (addr == 0x2003) {
            this.writeOAMAddress(value);
        } else if (addr == 0x2004) {
            this.writeOAMData(value);
        } else if (addr == 0x2006) {
            this.writeAddress(value);
        } else if (addr == 0x2007) {
            this.writeToAddress(value);
        } else if (addr == 0x4014) {
            this.writeDMA(value);
        }
    }

    read(addr: number): number {
        if (addr == 0x2000) {
            return this.readControl(addr);
        } else if (addr == 0x2002) {
            return this.readStatus();
        } else if (addr == 0x2001) {
            return this.readMask(addr);
        } else if (addr == 0x2003) {
            return this.readOAMAddress(addr);
        } else if (addr == 0x2004) {
            return this.readOAMData(addr);
        } else if (addr == 0x2006) {
            return this.readAddress(addr);
        } else if (addr == 0x2007) {
            return this.readFromAddress();
        } else if (addr == 0x4014) {
            return this.readDMA(addr);
        }
    }

    writeToAddress(value: number): void {
        this.vram[this.address] = value & 0xFF;
        this.address += 1; // + 32 if some flag is set
    }

    readFromAddress(): number {
        let t = this.vram[this.address];

        if (this.address <= 0x3EFF) {
            let buf = this.bufferedReadValue;
            this.bufferedReadValue = t;
            t = buf;
        } else {
            this.bufferedReadValue = this.vram[this.address - 0x1000];
        }

        return t;
    }

    writeAddress(value: number): void {
        value &= 0xFFFF;

        if (this.writeToggle) {
            this.tempAddrToWrite = (value & 0x3F) << 8;        
        } else {
            this.address = this.tempAddrToWrite | value;
        } 

        this.writeToggle = !this.writeToggle;
    }

    writeControl(value: number): void {
        
    }
    
    writeMask(value: number): void {
        
    }

    writeOAMAddress(value: number): void {
        
    }

    writeOAMData(value: number): void {
        
    }

    writeDMA(value: number): void {
        
    }

    readAddress(value: number): number {
        return 1;
    }

    readControl(value: number): number {
        return 1;
    }
    
    readMask(value: number): number {
        return 1;
    }

    readOAMAddress(value: number): number {
        return 1;
    }

    readOAMData(value: number): number {
        return 1;
    }

    readDMA(value: number): number {
        return 1;
    }
}