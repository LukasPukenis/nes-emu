export class Memory {
    private memory: Uint8Array;
    private ram: Uint8Array;

    constructor() {
        this.memory = new Uint8Array(0xFFFF);
        this.ram = new Uint8Array(2*1024);
    }

    read(addr: number) {
        // zero page? it's also mirrored twice: 0...0x7FF 0x800..0xFFF
        if (addr < 0x2000) {
            return this.ram[ addr % 0x800 ];
        } else if (addr < 0x4000) {
            // ppu
            throw new Error("Not implemented");
        } else if (addr == 0x4014) {
            // ppu
            throw new Error("Not implemented");
        } else if (addr == 0x4015) {
            // apu
            throw new Error("Not implemented");
        } else if (addr == 0x4016) {
            // joystick 1
            throw new Error("Not implemented");
        } else if (addr == 0x4017) {
            // joystick 2
            throw new Error("Not implemented");
        } else {
            return this.memory[ addr ];
        }
    }

    read16(addr: number) {
        let low =  this.read(addr);
        let high = this.read(addr+1);
        return (high << 8) | low;
    }

    write(addr: number, value: number) {
        if (addr < 0x2000) {
            this.ram[ addr % 0x800 ] = value;
        } else if (addr < 0x4000) {
            // ppu
            throw new Error("Not implemented");
        } else if (addr == 0x4014) {
            // ppu
            throw new Error("Not implemented");
        } else if (addr == 0x4015) {
            // apu
            throw new Error("Not implemented");
        } else if (addr == 0x4016) {
            // joystick 1
            throw new Error("Not implemented");
        } else if (addr == 0x4017) {
            // joystick 2
            throw new Error("Not implemented");
        } else {
            this.memory[ addr ] = value;
        }
    }    
}