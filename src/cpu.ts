import { Memory } from './memory';
import { ROM } from './rom';
import { Utils } from './utils';
import { PPU } from './ppu';
import { NES } from './nes';

export const CPU_FREQ = 1789773;

export type Register = number;

export enum StatusRegister {
    S = 1 << 7,
    O = 1 << 6,
    U = 1 << 5,
    B = 1 << 4,
    D = 1 << 3,
    I = 1 << 2,
    Z = 1 << 1,
    C = 1 << 0
};

enum AddressingModes {
    __NO__MODE__ = 0,
    modeAbsolute = 1,
	modeAbsoluteX = 2,
	modeAbsoluteY = 3,
	modeAccumulator = 4,
	modeImmediate = 5,
	modeImplied = 6,
	modeIndexedIndirect = 7,
	modeIndirect = 8,
	modeIndirectIndexed = 9,
	modeRelative = 10,
	modeZeroPage = 11,
	modeZeroPageX = 12,
	modeZeroPageY = 13
};

type OpData = number;

type Opcode = {
    name: string,
	cycles: number;	
    page_cost: number;
    size: number;
    addr_mode: AddressingModes;
	op: (cpu: CPU, data: OpData) => void;	
	noData?: boolean;
	showMemValue?: boolean;
};

// todo: showMemValue is almost redundant, only JMP absolute doesnt show value so it would make more sense to just add an oposite flag
const opcodes: Opcode[] = [
	{ name: "BRK", cycles: 7, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.BRK(data);} },
	{ name: "ORA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SLO", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, showMemValue: true },
	{ name: "ASL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);}, showMemValue: true },
	{ name: "*SLO", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);}, showMemValue: true },
	{ name: "PHP", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHP(data);}, noData: true },
	{ name: "ORA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ASLA(data);}, noData: true },
	{ name: "ANC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, showMemValue: true },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);}, showMemValue: true },
	{ name: "*SLO", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);}, showMemValue: true },
	{ name: "BPL", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BPL(data);} },
	{ name: "ORA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SLO", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "*SLO", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "CLC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLC(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SLO", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "*SLO", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "JSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JSR(data);} },
	{ name: "AND", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RLA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "BIT", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);}, showMemValue: true },
	{ name: "AND", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, showMemValue: true },
	{ name: "ROL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);}, showMemValue: true },
	{ name: "*RLA", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);}, showMemValue: true },
	{ name: "PLP", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLP(data);}, noData: true },
	{ name: "AND", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ROLA(data);}, noData: true},
	{ name: "ANC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "BIT", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);}, showMemValue: true },
	{ name: "AND", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, showMemValue: true },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);}, showMemValue: true },
	{ name: "*RLA", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);}, showMemValue: true },
	{ name: "BMI", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BMI(data);} },
	{ name: "AND", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RLA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "*RLA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "SEC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEC(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*RLA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "*RLA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "RTI", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTI(data);}, noData: true },
	{ name: "EOR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SRE", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, showMemValue: true },
	{ name: "LSR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);}, showMemValue: true },
	{ name: "*SRE", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);}, showMemValue: true },
	{ name: "PHA", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHA(data);}, noData: true },
	{ name: "EOR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.LSRA(data);}, noData: true },
	{ name: "ALR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ALR(data);} },
	{ name: "JMP", cycles: 3, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);} },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, showMemValue: true },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);}, showMemValue: true },
	{ name: "*SRE", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);}, showMemValue: true },
	{ name: "BVC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BVC(data);} },
	{ name: "EOR", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SRE", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "*SRE", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "CLI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLI(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SRE", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "*SRE", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "RTS", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTS(data);}, noData: true },
	{ name: "ADC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RRA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, showMemValue: true },
	{ name: "ROR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);}, showMemValue: true },
	{ name: "*RRA", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);}, showMemValue: true },
	{ name: "PLA", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLA(data);}, noData: true },
	{ name: "ADC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.RORA(data);}, noData: true },
	{ name: "ARR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ARR(data);} },
	{ name: "JMP", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeIndirect, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);},  },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, showMemValue: true },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);}, showMemValue: true },
	{ name: "*RRA", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);}, showMemValue: true },
	{ name: "BVS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BVS(data);} },
	{ name: "ADC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RRA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "*RRA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "SEI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEI(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*RRA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "*RRA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SAX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "STY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STY(data);}, showMemValue: true },
	{ name: "STA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, showMemValue: true },
	{ name: "STX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STX(data);}, showMemValue: true },
	{ name: "*SAX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);}, showMemValue: true },
	{ name: "DEY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEY(data);}, noData: true },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "TXA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXA(data);}, noData: true },
	{ name: "XAA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.XAA(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STY(data);}, showMemValue: true },
	{ name: "STA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, showMemValue: true },
	{ name: "STX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STX(data);}, showMemValue: true },
	{ name: "*SAX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);}, showMemValue: true },
	{ name: "BCC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BCC(data);} },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "AHX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.STY(data);} },
	{ name: "STA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "STX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.STX(data);} },
	{ name: "*SAX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "TYA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TYA(data);}, noData: true },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "TXS", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXS(data);}, noData: true },
	{ name: "TAS", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.TAS(data);}, noData: true },
	{ name: "SHY", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SHY(data);} },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "SHX", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SHX(data);} },
	{ name: "AHX", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "LDY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "*LAX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);}, showMemValue: true },
	{ name: "LDA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, showMemValue: true },
	{ name: "LDX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);}, showMemValue: true },
	{ name: "*LAX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);},showMemValue: true },
	{ name: "TAY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAY(data);}, noData: true },
	{ name: "LDA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TAX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAX(data);}, noData: true },
	{ name: "*LAX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);}, showMemValue: true },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, showMemValue: true },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);}, showMemValue: true },
	{ name: "*LAX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);}, showMemValue: true },
	{ name: "BCS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BCS(data);} },
	{ name: "LDA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*LAX", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "*LAX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "CLV", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLV(data);}, noData: true },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TSX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TSX(data);}, noData: true },
	{ name: "LAS", cycles: 4, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAS(data);} },
	{ name: "LDY", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "*LAX", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "CPY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);} },
	{ name: "CMP", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*DCP", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CPY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);}, showMemValue: true },
	{ name: "CMP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, showMemValue: true },
	{ name: "DEC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);}, showMemValue: true },
	{ name: "*DCP", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);}, showMemValue: true },
	{ name: "INY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INY(data);}, noData: true },
	{ name: "CMP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEX(data);}, noData: true },
	{ name: "AXS", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AXS(data);} },
	{ name: "CPY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);}, showMemValue: true },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, showMemValue: true },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);}, showMemValue: true },
	{ name: "*DCP", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);}, showMemValue: true },
	{ name: "BNE", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BNE(data);} },
	{ name: "CMP", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*DCP", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "*DCP", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CLD", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLD(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*DCP", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "*DCP", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CPX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);} },
	{ name: "SBC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*ISB", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "CPX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);}, showMemValue: true },
	{ name: "SBC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, showMemValue: true },
	{ name: "INC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.INC(data);}, showMemValue: true },
	{ name: "*ISB", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);}, showMemValue: true },
	{ name: "INX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INX(data);}, noData: true },
	{ name: "SBC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SBC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "CPX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);}, showMemValue: true },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, showMemValue: true },
	{ name: "INC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.INC(data);}, showMemValue: true },
	{ name: "*ISB", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);}, showMemValue: true },
	{ name: "BEQ", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BEQ(data);} },
	{ name: "SBC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*ISB", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "*ISB", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "SED", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SED(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*ISB", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "*ISB", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} }	
];

const AddressDecodersPrefix: any = {
	[AddressingModes.modeAbsolute]: '$',
    [AddressingModes.modeAbsoluteX]: '$',
    [AddressingModes.modeAbsoluteY]: '$',
    [AddressingModes.modeAccumulator]: '$',
    [AddressingModes.modeImmediate]: '#$',
    [AddressingModes.modeImplied]: '$',
    [AddressingModes.modeIndexedIndirect]: '$',
    [AddressingModes.modeIndirect]: '$',
    [AddressingModes.modeIndirectIndexed]: '$',
    [AddressingModes.modeRelative]: '$',
    [AddressingModes.modeZeroPage]: '$',
    [AddressingModes.modeZeroPageX]: '$',
    [AddressingModes.modeZeroPageY]: '$'
};

enum Interrupt {
	None,
	NMI,
	IRQ
};

export class CPU {
	ppu: PPU;    
    A:  Register;
    X:  Register;
    Y:  Register;
    PC: Register;
    SP:  Register;
    P:  Register;
	
	interrupt: Interrupt = Interrupt.None;
	stallCycles: number = 0;
	cycles: number;
	cyclesToAdd: number;
	memory: Memory;

	PPUCNT1: number;
	PPUCNT2: number;
	rom: ROM;
	nes: NES;
	debugOpcode: string;
	currentOpcode: Opcode;
	currentData: any;

	opcodeIndex: number;

	constructor(nes: NES) {
		this.nes = nes;
		this.memory = nes.getMemory();
	}

    loadROM(rom: ROM, startingAddress?: number) {		
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFD;
        this.P = 0x24; // it can be 0x34 or 0x24 as the fifth bit is ignored/reserved
        this.PC = 0;

		this.cycles = 7;
		this.cyclesToAdd = 0;

		this.PPUCNT1 = 0;
		this.PPUCNT2 = 0;        
    this.rom = rom;

		let prgroms = this.rom.getPRGROMS();
		let prgromIndex1 = 0;
		let prgRomIndex2 = 0;
		if (prgroms.length == 1) {
		} else if (prgroms.length == 2) {
			prgRomIndex2 = 1;
		} else {
			console.error("PRGROM count is errorneous:", prgroms.length);
		}       
		
		
    for (let i = 0; i < 0x4000; i++) {
			this.memory.write(0x8000+i, prgroms[prgromIndex1][i]);
			this.memory.write(0xC000+i, prgroms[prgRomIndex2][i]);
    }	

		// starting location for NROM is FFFC-FFFD
		if (!startingAddress)
			this.PC = (this.memory.read(0xFFFD) << 8) | this.memory.read(0xFFFC)
		else
			this.PC = startingAddress;

		console.log("Starting @ ", Utils.prettyHex(this.PC));
	}

	pagesDiffer(a: number, b: number): boolean {
		return (a & 0xFF00) != (b & 0xFF00);
	}

	addPageCycles(a: number, b: number) {
		this.cycles++;
		if (this.pagesDiffer(a, b))
			this.cycles++;		
	}
		
	setStall(cycles: number) {
		this.stallCycles = cycles;
	}	
	
	nmi() {
		this.push16(this.PC);
		this.PHP(0);
		this.PC = this.memory.read16(0xFFFA);
		this.SEI(1);
		this.cyclesToAdd += 7
	}

    step() {
		if (this.stallCycles > 0) {
			this.stallCycles--;
			return 1;
		}

		if (this.interrupt == Interrupt.NMI) {				
			this.nmi();
			this.interrupt = Interrupt.None;
		}		

		this.opcodeIndex = this.memory.read(this.PC);
		let opcode = opcodes[this.opcodeIndex];		
		let opcodeData: OpData;

		switch(opcode.addr_mode) {
		case 1:
			opcodeData = this.memory.read16(this.PC + 1);
			break;
		case 2:
			opcodeData = 0xFFFF & (this.memory.read16(this.PC+1) + this.X);

			if (this.pagesDiffer((opcodeData-this.X) & 0xFFFF, opcodeData))
				this.cyclesToAdd += opcode.page_cost;

			break;
		case 3:
			opcodeData = 0xFFFF & (this.memory.read16(this.PC+1) + this.Y);

			if (this.pagesDiffer((opcodeData-this.Y) & 0xFFFF, opcodeData))
				this.cyclesToAdd += opcode.page_cost;

			break;
		case 4:
			
			break;
		case 5:
			opcodeData = this.PC + 1;
			break;
		case 6:
			
			break;
		case 7:
			opcodeData = this.memory.read16bug(0xFF & (this.memory.read(this.PC + 1) + this.X));
			break;
		case 8:
			opcodeData = this.memory.read16bug(this.memory.read16(this.PC + 1));
			break;
		case 9:
			opcodeData = this.memory.read16bug(0xFF & (this.memory.read(this.PC + 1) & 0xFF)) + this.Y;
			opcodeData &= 0xFFFF;				

			if (this.pagesDiffer((opcodeData-this.Y) & 0xFFFF, opcodeData))
				this.cyclesToAdd += opcode.page_cost;

			break;
		case 10:
			let offset = this.memory.read(this.PC + 1);
			if (offset < 0x80) {
				opcodeData = offset + this.PC + 2;
			} else {
				opcodeData = offset + this.PC + 2 - 0x100;
			}

			break;
		case 11:
			opcodeData = 0xFF & this.memory.read(this.PC + 1);
			break;
		case 12:
			opcodeData = 0xFF & this.memory.read(this.PC + 1) + this.X;
			break;
		case 13:
			opcodeData = 0xFF & this.memory.read(this.PC + 1) + this.Y;
			break;
	}
		
		this.currentData = opcodeData;
		this.currentOpcode = opcode;		
		let data = opcodeData;

		if (window.hasOwnProperty('DEBUG_CPU')) { // todo: make this code be based on testing flag which should be set in each test file yadda yadda
			// throw new Error('This function has side effects and it costs you hours!!!!!');
			
			let data: OpData = this.currentData;
			// todo: maybe addresser should just return memory read instead of this case
			if (this.currentOpcode.addr_mode == AddressingModes.modeImmediate)
				data = this.memory.read(this.currentData, true);

			let prefix = AddressDecodersPrefix[this.currentOpcode.addr_mode];
		
			let output: string[] = [];		
			output.push(this.PC.toString(16).toUpperCase().padStart(4, '0'));		

			let _data = [];
			for (let i = 0; i < this.currentOpcode.size; i++)
				_data.push(this.memory.read(this.PC + i, true).toString(16).toUpperCase().padStart(2, '0'));		

			output.push(_data.join(' '));

			let instruction = this.currentOpcode.name;
			
			// display the data of opcode
			if (!this.currentOpcode.noData &&
				this.currentOpcode.addr_mode != AddressingModes.modeIndexedIndirect &&
				this.currentOpcode.addr_mode != AddressingModes.modeIndirectIndexed &&
				this.currentOpcode.addr_mode != AddressingModes.modeIndirect &&
				this.currentOpcode.addr_mode != AddressingModes.modeAbsoluteX &&
				this.currentOpcode.addr_mode != AddressingModes.modeAbsoluteY &&
				this.currentOpcode.addr_mode != AddressingModes.modeZeroPageX &&
				this.currentOpcode.addr_mode != AddressingModes.modeZeroPageY) {
				let size = 2;
				if (this.currentOpcode.addr_mode == AddressingModes.modeAbsolute)
					size = 4;

				instruction += ' '+ prefix + data.toString(16).toUpperCase().padStart(size, '0');
			}
			
			
			if (!this.currentOpcode.noData) {
				if (this.currentOpcode.showMemValue && (data < 0x2000 || data > 0x2007)) {
				instruction += ' = ' + this.memory.read(data, true).toString(16).toUpperCase().padStart(2, '0');			
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeAbsolute) {
					
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeZeroPage) {
					
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeAbsoluteX) {
					let addr = this.memory.read16(this.PC + 1, true);
					let val = this.memory.read(0xFFFF & (addr + this.X), true);
					instruction += ` $${Utils.prettyHex(addr)},X @ ${Utils.prettyHex(data)} = ${Utils.prettyHex(val, 2)}`;
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeAbsoluteY) {
					let addr = this.memory.read16(this.PC + 1, true);							
					let val = this.memory.read(0xFFFF & (addr + this.Y), true);	
					instruction += ` $${Utils.prettyHex(addr)},Y @ ${Utils.prettyHex(data)} = ${Utils.prettyHex(val, 2)}`;			
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeIndirect) {
					let addr = this.memory.read16(this.PC + 1, true);
					let val = addr;

					instruction += ` ($${Utils.prettyHex(addr)}) = ${Utils.prettyHex(data)}`;
				}			

				if (this.currentOpcode.addr_mode == AddressingModes.modeZeroPageX) {
					let addr = this.memory.read(this.PC + 1, true);
					let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
					let finalAddr = (addr+this.X) & 0xFF;
					let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

					instruction += ` $${addrStr},X @ ${finalAddrStr}`;			
					instruction += ' = ' + this.memory.read(data, true).toString(16).toUpperCase().padStart(2, '0');			
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeZeroPageY) {
					let addr = this.memory.read(this.PC + 1, true);
					let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
					let finalAddr = (addr+this.Y) & 0xFF;
					let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

					instruction += ` $${addrStr},Y @ ${finalAddrStr}`;			
					instruction += ' = ' + this.memory.read(data, true).toString(16).toUpperCase().padStart(2, '0');			
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeIndirectIndexed) {
					let addr = this.memory.read(this.PC + 1, true);
					
					let addrStr = Utils.prettyHex(addr, 2);
					let val = this.memory.read16bug((this.memory.read(this.PC + 1, true) & 0xFF), true);
					
					instruction += ` ($${addrStr}),Y`;
					instruction += ' = ' + (val).toString(16).toUpperCase().padStart(4, '0');			
					instruction += ' @ ' + data.toString(16).toUpperCase().padStart(4, '0');			
					instruction += ' = ' + this.memory.read(data, true).toString(16).toUpperCase().padStart(2, '0');						
				}

				if (this.currentOpcode.addr_mode == AddressingModes.modeIndexedIndirect) {
					let addr = this.memory.read(this.PC + 1, true);

					let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
					let finalAddr = (addr+this.X) & 0xFF;
					let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

					instruction += ` ($${addrStr},X) @ ${finalAddrStr}`;
					instruction += ' = ' + data.toString(16).toUpperCase().padStart(4, '0');			
					instruction += ' = ' + this.memory.read(data, true).toString(16).toUpperCase().padStart(2, '0');			
				}
			}

			output.push(instruction);
			output.push('A:' + this.A.toString(16).toUpperCase().padStart(2, '0'));
			output.push('X:' + this.X.toString(16).toUpperCase().padStart(2, '0'));
			output.push('Y:' + this.Y.toString(16).toUpperCase().padStart(2, '0'));
			output.push('P:' + this.P.toString(16).toUpperCase().padStart(2, '0'));
			output.push('SP:' + this.SP.toString(16).toUpperCase().padStart(2, '0'));		
			// output.push(`PPU:${this.PPUCNT1.toString().padStart(2, ' ')},${this.PPUCNT2.toString().padStart(2, ' ')}`);
			output.push('CYC:' + this.cycles);
			this.debugOpcode = output.join(' ');	
		}
		

		let cyclesWasted = this.cyclesToAdd;		
		
switch (this.opcodeIndex) {
case 0:
	cyclesWasted += 7;
	this.PC += 1;
	this.BRK(data);
	break;
case 1:
	cyclesWasted += 6;
	this.PC += 2;
	this.ORA(data);
	break;
case 2:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 3:
	cyclesWasted += 8;
	this.PC += 2;
	this.SLO(data);
	break;
case 4:
	cyclesWasted += 3;
	this.PC += 2;
	this.NOP(data);
	break;
case 5:
	cyclesWasted += 3;
	this.PC += 2;
	this.ORA(data);
	break;
case 6:
	cyclesWasted += 5;
	this.PC += 2;
	this.ASL(data);
	break;
case 7:
	cyclesWasted += 5;
	this.PC += 2;
	this.SLO(data);
	break;
case 8:
	cyclesWasted += 3;
	this.PC += 1;
	this.PHP(data);
	break;
case 9:
	cyclesWasted += 2;
	this.PC += 2;
	this.ORA(data);
	break;
case 10:
	cyclesWasted += 2;
	this.PC += 1;
	this.ASLA(data);
	break;
case 11:
	cyclesWasted += 2;
	this.PC += 2;
	this.ANC(data);
	break;
case 12:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 13:
	cyclesWasted += 4;
	this.PC += 3;
	this.ORA(data);
	break;
case 14:
	cyclesWasted += 6;
	this.PC += 3;
	this.ASL(data);
	break;
case 15:
	cyclesWasted += 6;
	this.PC += 3;
	this.SLO(data);
	break;
case 16:
	cyclesWasted += 2;
	this.PC += 2;
	this.BPL(data);
	break;
case 17:
	cyclesWasted += 5;
	this.PC += 2;
	this.ORA(data);
	break;
case 18:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 19:
	cyclesWasted += 8;
	this.PC += 2;
	this.SLO(data);
	break;
case 20:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 21:
	cyclesWasted += 4;
	this.PC += 2;
	this.ORA(data);
	break;
case 22:
	cyclesWasted += 6;
	this.PC += 2;
	this.ASL(data);
	break;
case 23:
	cyclesWasted += 6;
	this.PC += 2;
	this.SLO(data);
	break;
case 24:
	cyclesWasted += 2;
	this.PC += 1;
	this.CLC(data);
	break;
case 25:
	cyclesWasted += 4;
	this.PC += 3;
	this.ORA(data);
	break;
case 26:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 27:
	cyclesWasted += 7;
	this.PC += 3;
	this.SLO(data);
	break;
case 28:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 29:
	cyclesWasted += 4;
	this.PC += 3;
	this.ORA(data);
	break;
case 30:
	cyclesWasted += 7;
	this.PC += 3;
	this.ASL(data);
	break;
case 31:
	cyclesWasted += 7;
	this.PC += 3;
	this.SLO(data);
	break;
case 32:
	cyclesWasted += 6;
	this.PC += 3;
	this.JSR(data);
	break;
case 33:
	cyclesWasted += 6;
	this.PC += 2;
	this.AND(data);
	break;
case 34:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 35:
	cyclesWasted += 8;
	this.PC += 2;
	this.RLA(data);
	break;
case 36:
	cyclesWasted += 3;
	this.PC += 2;
	this.BIT(data);
	break;
case 37:
	cyclesWasted += 3;
	this.PC += 2;
	this.AND(data);
	break;
case 38:
	cyclesWasted += 5;
	this.PC += 2;
	this.ROL(data);
	break;
case 39:
	cyclesWasted += 5;
	this.PC += 2;
	this.RLA(data);
	break;
case 40:
	cyclesWasted += 4;
	this.PC += 1;
	this.PLP(data);
	break;
case 41:
	cyclesWasted += 2;
	this.PC += 2;
	this.AND(data);
	break;
case 42:
	cyclesWasted += 2;
	this.PC += 1;
	this.ROLA(data);
	break;
case 43:
	cyclesWasted += 2;
	this.PC += 2;
	this.ANC(data);
	break;
case 44:
	cyclesWasted += 4;
	this.PC += 3;
	this.BIT(data);
	break;
case 45:
	cyclesWasted += 4;
	this.PC += 3;
	this.AND(data);
	break;
case 46:
	cyclesWasted += 6;
	this.PC += 3;
	this.ROL(data);
	break;
case 47:
	cyclesWasted += 6;
	this.PC += 3;
	this.RLA(data);
	break;
case 48:
	cyclesWasted += 2;
	this.PC += 2;
	this.BMI(data);
	break;
case 49:
	cyclesWasted += 5;
	this.PC += 2;
	this.AND(data);
	break;
case 50:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 51:
	cyclesWasted += 8;
	this.PC += 2;
	this.RLA(data);
	break;
case 52:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 53:
	cyclesWasted += 4;
	this.PC += 2;
	this.AND(data);
	break;
case 54:
	cyclesWasted += 6;
	this.PC += 2;
	this.ROL(data);
	break;
case 55:
	cyclesWasted += 6;
	this.PC += 2;
	this.RLA(data);
	break;
case 56:
	cyclesWasted += 2;
	this.PC += 1;
	this.SEC(data);
	break;
case 57:
	cyclesWasted += 4;
	this.PC += 3;
	this.AND(data);
	break;
case 58:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 59:
	cyclesWasted += 7;
	this.PC += 3;
	this.RLA(data);
	break;
case 60:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 61:
	cyclesWasted += 4;
	this.PC += 3;
	this.AND(data);
	break;
case 62:
	cyclesWasted += 7;
	this.PC += 3;
	this.ROL(data);
	break;
case 63:
	cyclesWasted += 7;
	this.PC += 3;
	this.RLA(data);
	break;
case 64:
	cyclesWasted += 6;
	this.PC += 1;
	this.RTI(data);
	break;
case 65:
	cyclesWasted += 6;
	this.PC += 2;
	this.EOR(data);
	break;
case 66:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 67:
	cyclesWasted += 8;
	this.PC += 2;
	this.SRE(data);
	break;
case 68:
	cyclesWasted += 3;
	this.PC += 2;
	this.NOP(data);
	break;
case 69:
	cyclesWasted += 3;
	this.PC += 2;
	this.EOR(data);
	break;
case 70:
	cyclesWasted += 5;
	this.PC += 2;
	this.LSR(data);
	break;
case 71:
	cyclesWasted += 5;
	this.PC += 2;
	this.SRE(data);
	break;
case 72:
	cyclesWasted += 3;
	this.PC += 1;
	this.PHA(data);
	break;
case 73:
	cyclesWasted += 2;
	this.PC += 2;
	this.EOR(data);
	break;
case 74:
	cyclesWasted += 2;
	this.PC += 1;
	this.LSRA(data);
	break;
case 75:
	cyclesWasted += 2;
	this.PC += 2;
	this.ALR(data);
	break;
case 76:
	cyclesWasted += 3;
	this.PC += 3;
	this.JMP(data);
	break;
case 77:
	cyclesWasted += 4;
	this.PC += 3;
	this.EOR(data);
	break;
case 78:
	cyclesWasted += 6;
	this.PC += 3;
	this.LSR(data);
	break;
case 79:
	cyclesWasted += 6;
	this.PC += 3;
	this.SRE(data);
	break;
case 80:
	cyclesWasted += 2;
	this.PC += 2;
	this.BVC(data);
	break;
case 81:
	cyclesWasted += 5;
	this.PC += 2;
	this.EOR(data);
	break;
case 82:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 83:
	cyclesWasted += 8;
	this.PC += 2;
	this.SRE(data);
	break;
case 84:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 85:
	cyclesWasted += 4;
	this.PC += 2;
	this.EOR(data);
	break;
case 86:
	cyclesWasted += 6;
	this.PC += 2;
	this.LSR(data);
	break;
case 87:
	cyclesWasted += 6;
	this.PC += 2;
	this.SRE(data);
	break;
case 88:
	cyclesWasted += 2;
	this.PC += 1;
	this.CLI(data);
	break;
case 89:
	cyclesWasted += 4;
	this.PC += 3;
	this.EOR(data);
	break;
case 90:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 91:
	cyclesWasted += 7;
	this.PC += 3;
	this.SRE(data);
	break;
case 92:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 93:
	cyclesWasted += 4;
	this.PC += 3;
	this.EOR(data);
	break;
case 94:
	cyclesWasted += 7;
	this.PC += 3;
	this.LSR(data);
	break;
case 95:
	cyclesWasted += 7;
	this.PC += 3;
	this.SRE(data);
	break;
case 96:
	cyclesWasted += 6;
	this.PC += 1;
	this.RTS(data);
	break;
case 97:
	cyclesWasted += 6;
	this.PC += 2;
	this.ADC(data);
	break;
case 98:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 99:
	cyclesWasted += 8;
	this.PC += 2;
	this.RRA(data);
	break;
case 100:
	cyclesWasted += 3;
	this.PC += 2;
	this.NOP(data);
	break;
case 101:
	cyclesWasted += 3;
	this.PC += 2;
	this.ADC(data);
	break;
case 102:
	cyclesWasted += 5;
	this.PC += 2;
	this.ROR(data);
	break;
case 103:
	cyclesWasted += 5;
	this.PC += 2;
	this.RRA(data);
	break;
case 104:
	cyclesWasted += 4;
	this.PC += 1;
	this.PLA(data);
	break;
case 105:
	cyclesWasted += 2;
	this.PC += 2;
	this.ADC(data);
	break;
case 106:
	cyclesWasted += 2;
	this.PC += 1;
	this.RORA(data);
	break;
case 107:
	cyclesWasted += 2;
	this.PC += 2;
	this.ARR(data);
	break;
case 108:
	cyclesWasted += 5;
	this.PC += 3;
	this.JMP(data);
	break;
case 109:
	cyclesWasted += 4;
	this.PC += 3;
	this.ADC(data);
	break;
case 110:
	cyclesWasted += 6;
	this.PC += 3;
	this.ROR(data);
	break;
case 111:
	cyclesWasted += 6;
	this.PC += 3;
	this.RRA(data);
	break;
case 112:
	cyclesWasted += 2;
	this.PC += 2;
	this.BVS(data);
	break;
case 113:
	cyclesWasted += 5;
	this.PC += 2;
	this.ADC(data);
	break;
case 114:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 115:
	cyclesWasted += 8;
	this.PC += 2;
	this.RRA(data);
	break;
case 116:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 117:
	cyclesWasted += 4;
	this.PC += 2;
	this.ADC(data);
	break;
case 118:
	cyclesWasted += 6;
	this.PC += 2;
	this.ROR(data);
	break;
case 119:
	cyclesWasted += 6;
	this.PC += 2;
	this.RRA(data);
	break;
case 120:
	cyclesWasted += 2;
	this.PC += 1;
	this.SEI(data);
	break;
case 121:
	cyclesWasted += 4;
	this.PC += 3;
	this.ADC(data);
	break;
case 122:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 123:
	cyclesWasted += 7;
	this.PC += 3;
	this.RRA(data);
	break;
case 124:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 125:
	cyclesWasted += 4;
	this.PC += 3;
	this.ADC(data);
	break;
case 126:
	cyclesWasted += 7;
	this.PC += 3;
	this.ROR(data);
	break;
case 127:
	cyclesWasted += 7;
	this.PC += 3;
	this.RRA(data);
	break;
case 128:
	cyclesWasted += 2;
	this.PC += 2;
	this.NOP(data);
	break;
case 129:
	cyclesWasted += 6;
	this.PC += 2;
	this.STA(data);
	break;
case 130:
	cyclesWasted += 2;
	this.PC += 2;
	this.NOP(data);
	break;
case 131:
	cyclesWasted += 6;
	this.PC += 2;
	this.SAX(data);
	break;
case 132:
	cyclesWasted += 3;
	this.PC += 2;
	this.STY(data);
	break;
case 133:
	cyclesWasted += 3;
	this.PC += 2;
	this.STA(data);
	break;
case 134:
	cyclesWasted += 3;
	this.PC += 2;
	this.STX(data);
	break;
case 135:
	cyclesWasted += 3;
	this.PC += 2;
	this.SAX(data);
	break;
case 136:
	cyclesWasted += 2;
	this.PC += 1;
	this.DEY(data);
	break;
case 137:
	cyclesWasted += 2;
	this.PC += 2;
	this.NOP(data);
	break;
case 138:
	cyclesWasted += 2;
	this.PC += 1;
	this.TXA(data);
	break;
case 139:
	cyclesWasted += 2;
	this.PC += 2;
	this.XAA(data);
	break;
case 140:
	cyclesWasted += 4;
	this.PC += 3;
	this.STY(data);
	break;
case 141:
	cyclesWasted += 4;
	this.PC += 3;
	this.STA(data);
	break;
case 142:
	cyclesWasted += 4;
	this.PC += 3;
	this.STX(data);
	break;
case 143:
	cyclesWasted += 4;
	this.PC += 3;
	this.SAX(data);
	break;
case 144:
	cyclesWasted += 2;
	this.PC += 2;
	this.BCC(data);
	break;
case 145:
	cyclesWasted += 6;
	this.PC += 2;
	this.STA(data);
	break;
case 146:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 147:
	cyclesWasted += 6;
	this.PC += 2;
	this.AHX(data);
	break;
case 148:
	cyclesWasted += 4;
	this.PC += 2;
	this.STY(data);
	break;
case 149:
	cyclesWasted += 4;
	this.PC += 2;
	this.STA(data);
	break;
case 150:
	cyclesWasted += 4;
	this.PC += 2;
	this.STX(data);
	break;
case 151:
	cyclesWasted += 4;
	this.PC += 2;
	this.SAX(data);
	break;
case 152:
	cyclesWasted += 2;
	this.PC += 1;
	this.TYA(data);
	break;
case 153:
	cyclesWasted += 5;
	this.PC += 3;
	this.STA(data);
	break;
case 154:
	cyclesWasted += 2;
	this.PC += 1;
	this.TXS(data);
	break;
case 155:
	cyclesWasted += 5;
	this.PC += 2;
	this.TAS(data);
	break;
case 156:
	cyclesWasted += 5;
	this.PC += 2;
	this.SHY(data);
	break;
case 157:
	cyclesWasted += 5;
	this.PC += 3;
	this.STA(data);
	break;
case 158:
	cyclesWasted += 5;
	this.PC += 2;
	this.SHX(data);
	break;
case 159:
	cyclesWasted += 5;
	this.PC += 2;
	this.AHX(data);
	break;
case 160:
	cyclesWasted += 2;
	this.PC += 2;
	this.LDY(data);
	break;
case 161:
	cyclesWasted += 6;
	this.PC += 2;
	this.LDA(data);
	break;
case 162:
	cyclesWasted += 2;
	this.PC += 2;
	this.LDX(data);
	break;
case 163:
	cyclesWasted += 6;
	this.PC += 2;
	this.LAX(data);
	break;
case 164:
	cyclesWasted += 3;
	this.PC += 2;
	this.LDY(data);
	break;
case 165:
	cyclesWasted += 3;
	this.PC += 2;
	this.LDA(data);
	break;
case 166:
	cyclesWasted += 3;
	this.PC += 2;
	this.LDX(data);
	break;
case 167:
	cyclesWasted += 3;
	this.PC += 2;
	this.LAX(data);
	break;
case 168:
	cyclesWasted += 2;
	this.PC += 1;
	this.TAY(data);
	break;
case 169:
	cyclesWasted += 2;
	this.PC += 2;
	this.LDA(data);
	break;
case 170:
	cyclesWasted += 2;
	this.PC += 1;
	this.TAX(data);
	break;
case 171:
	cyclesWasted += 2;
	this.PC += 2;
	this.LAX(data);
	break;
case 172:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDY(data);
	break;
case 173:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDA(data);
	break;
case 174:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDX(data);
	break;
case 175:
	cyclesWasted += 4;
	this.PC += 3;
	this.LAX(data);
	break;
case 176:
	cyclesWasted += 2;
	this.PC += 2;
	this.BCS(data);
	break;
case 177:
	cyclesWasted += 5;
	this.PC += 2;
	this.LDA(data);
	break;
case 178:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 179:
	cyclesWasted += 5;
	this.PC += 2;
	this.LAX(data);
	break;
case 180:
	cyclesWasted += 4;
	this.PC += 2;
	this.LDY(data);
	break;
case 181:
	cyclesWasted += 4;
	this.PC += 2;
	this.LDA(data);
	break;
case 182:
	cyclesWasted += 4;
	this.PC += 2;
	this.LDX(data);
	break;
case 183:
	cyclesWasted += 4;
	this.PC += 2;
	this.LAX(data);
	break;
case 184:
	cyclesWasted += 2;
	this.PC += 1;
	this.CLV(data);
	break;
case 185:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDA(data);
	break;
case 186:
	cyclesWasted += 2;
	this.PC += 1;
	this.TSX(data);
	break;
case 187:
	cyclesWasted += 4;
	this.PC += 2;
	this.LAS(data);
	break;
case 188:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDY(data);
	break;
case 189:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDA(data);
	break;
case 190:
	cyclesWasted += 4;
	this.PC += 3;
	this.LDX(data);
	break;
case 191:
	cyclesWasted += 4;
	this.PC += 3;
	this.LAX(data);
	break;
case 192:
	cyclesWasted += 2;
	this.PC += 2;
	this.CPY(data);
	break;
case 193:
	cyclesWasted += 6;
	this.PC += 2;
	this.CMP(data);
	break;
case 194:
	cyclesWasted += 2;
	this.PC += 2;
	this.NOP(data);
	break;
case 195:
	cyclesWasted += 8;
	this.PC += 2;
	this.DCP(data);
	break;
case 196:
	cyclesWasted += 3;
	this.PC += 2;
	this.CPY(data);
	break;
case 197:
	cyclesWasted += 3;
	this.PC += 2;
	this.CMP(data);
	break;
case 198:
	cyclesWasted += 5;
	this.PC += 2;
	this.DEC(data);
	break;
case 199:
	cyclesWasted += 5;
	this.PC += 2;
	this.DCP(data);
	break;
case 200:
	cyclesWasted += 2;
	this.PC += 1;
	this.INY(data);
	break;
case 201:
	cyclesWasted += 2;
	this.PC += 2;
	this.CMP(data);
	break;
case 202:
	cyclesWasted += 2;
	this.PC += 1;
	this.DEX(data);
	break;
case 203:
	cyclesWasted += 2;
	this.PC += 2;
	this.AXS(data);
	break;
case 204:
	cyclesWasted += 4;
	this.PC += 3;
	this.CPY(data);
	break;
case 205:
	cyclesWasted += 4;
	this.PC += 3;
	this.CMP(data);
	break;
case 206:
	cyclesWasted += 6;
	this.PC += 3;
	this.DEC(data);
	break;
case 207:
	cyclesWasted += 6;
	this.PC += 3;
	this.DCP(data);
	break;
case 208:
	cyclesWasted += 2;
	this.PC += 2;
	this.BNE(data);
	break;
case 209:
	cyclesWasted += 5;
	this.PC += 2;
	this.CMP(data);
	break;
case 210:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 211:
	cyclesWasted += 8;
	this.PC += 2;
	this.DCP(data);
	break;
case 212:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 213:
	cyclesWasted += 4;
	this.PC += 2;
	this.CMP(data);
	break;
case 214:
	cyclesWasted += 6;
	this.PC += 2;
	this.DEC(data);
	break;
case 215:
	cyclesWasted += 6;
	this.PC += 2;
	this.DCP(data);
	break;
case 216:
	cyclesWasted += 2;
	this.PC += 1;
	this.CLD(data);
	break;
case 217:
	cyclesWasted += 4;
	this.PC += 3;
	this.CMP(data);
	break;
case 218:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 219:
	cyclesWasted += 7;
	this.PC += 3;
	this.DCP(data);
	break;
case 220:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 221:
	cyclesWasted += 4;
	this.PC += 3;
	this.CMP(data);
	break;
case 222:
	cyclesWasted += 7;
	this.PC += 3;
	this.DEC(data);
	break;
case 223:
	cyclesWasted += 7;
	this.PC += 3;
	this.DCP(data);
	break;
case 224:
	cyclesWasted += 2;
	this.PC += 2;
	this.CPX(data);
	break;
case 225:
	cyclesWasted += 6;
	this.PC += 2;
	this.SBC(data);
	break;
case 226:
	cyclesWasted += 2;
	this.PC += 2;
	this.NOP(data);
	break;
case 227:
	cyclesWasted += 8;
	this.PC += 2;
	this.ISB(data);
	break;
case 228:
	cyclesWasted += 3;
	this.PC += 2;
	this.CPX(data);
	break;
case 229:
	cyclesWasted += 3;
	this.PC += 2;
	this.SBC(data);
	break;
case 230:
	cyclesWasted += 5;
	this.PC += 2;
	this.INC(data);
	break;
case 231:
	cyclesWasted += 5;
	this.PC += 2;
	this.ISB(data);
	break;
case 232:
	cyclesWasted += 2;
	this.PC += 1;
	this.INX(data);
	break;
case 233:
	cyclesWasted += 2;
	this.PC += 2;
	this.SBC(data);
	break;
case 234:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 235:
	cyclesWasted += 2;
	this.PC += 2;
	this.SBC(data);
	break;
case 236:
	cyclesWasted += 4;
	this.PC += 3;
	this.CPX(data);
	break;
case 237:
	cyclesWasted += 4;
	this.PC += 3;
	this.SBC(data);
	break;
case 238:
	cyclesWasted += 6;
	this.PC += 3;
	this.INC(data);
	break;
case 239:
	cyclesWasted += 6;
	this.PC += 3;
	this.ISB(data);
	break;
case 240:
	cyclesWasted += 2;
	this.PC += 2;
	this.BEQ(data);
	break;
case 241:
	cyclesWasted += 5;
	this.PC += 2;
	this.SBC(data);
	break;
case 242:
	cyclesWasted += 2;
	this.PC += 2;
	this.KIL(data);
	break;
case 243:
	cyclesWasted += 8;
	this.PC += 2;
	this.ISB(data);
	break;
case 244:
	cyclesWasted += 4;
	this.PC += 2;
	this.NOP(data);
	break;
case 245:
	cyclesWasted += 4;
	this.PC += 2;
	this.SBC(data);
	break;
case 246:
	cyclesWasted += 6;
	this.PC += 2;
	this.INC(data);
	break;
case 247:
	cyclesWasted += 6;
	this.PC += 2;
	this.ISB(data);
	break;
case 248:
	cyclesWasted += 2;
	this.PC += 1;
	this.SED(data);
	break;
case 249:
	cyclesWasted += 4;
	this.PC += 3;
	this.SBC(data);
	break;
case 250:
	cyclesWasted += 2;
	this.PC += 1;
	this.NOP(data);
	break;
case 251:
	cyclesWasted += 7;
	this.PC += 3;
	this.ISB(data);
	break;
case 252:
	cyclesWasted += 4;
	this.PC += 3;
	this.NOP(data);
	break;
case 253:
	cyclesWasted += 4;
	this.PC += 3;
	this.SBC(data);
	break;
case 254:
	cyclesWasted += 7;
	this.PC += 3;
	this.INC(data);
	break;
case 255:
	cyclesWasted += 7;
	this.PC += 3;
	this.ISB(data);
	break;		
		}

		this.cycles += cyclesWasted;
		this.cyclesToAdd = 0;
		
		/////////////////////
		/////////////////////
		/////////////////////
		/////////////////////
		

		return cyclesWasted;
    }

	triggerNMI(): void {
		this.interrupt = Interrupt.NMI;
	}

    dumpDebug() {
		return this.debugOpcode;
	}
	
	_cmp(a: OpData, b: OpData) {
		this.setZN(a-b);
		if (a >= b) {
			this.P |= 1;
		} else {
			this.P &= 0b11111110;
		}		
	}

	setZ(data: OpData) {
		if (data == 0) {
			this.P |= 0b00000010;
		} else {
			this.P &= 0b11111101;
		}		
	}

	setO(data: OpData) {
		this.P &= 0b10111111;
		this.P |= data & 0b01000000;
	}

	setN(data: OpData) {				
		// this.P &= 0b01111111;		
		// this.P |= data & 0b10000000;		

		if ((data & 0x80) != 0) {
			this.P |= 0b10000000;
		} else {
			this.P &= 0b01111111;
		}
	}

	setC(data: OpData) {
		this.P &= 0b11111110;
		let bit = (data >> 7) & 1;
		this.P |= bit;
	}

	setZN(data: OpData) {
		this.setZ(data);
		this.setN(data);
	}

	pop() {
		this.SP++;
		this.SP &= 0xFF;
		return this.memory.read(0x100 | this.SP);
	}

	pop16() {
		let lo = this.pop();
		let hi = this.pop();
		return hi << 8 | lo;
	}

	push(data: OpData) { // todo: make sure there's a huge difference between this and 16 variant - rename to 8 if needed		
		this.memory.write(0x100 | this.SP, data);
		this.SP--;
		this.SP &= 0xFF;
	}

	push16(data: OpData) {
		let hi = data >> 8;
		let lo = data & 0xFF;
		this.push(hi);
		this.push(lo);
	}
	
    // INSTRUCTIONS
    BRK(data: OpData): void {
		// todo instr
    }
    
    ORA(data: OpData): void {
		this.A = this.A | this.memory.read(data);
		this.setZN(this.A);
    }
    
    KIL(data: OpData): void {
        
    }
    
    SLO(data: OpData): void {		
		this.ASL(data);
		this.ORA(data);		
    }
    
    NOP(data: OpData): void {
        
	}
	
	ASLA(data: OpData): void {		
		this.setC(this.A);
		this.A <<= 1;
		this.A &= 0xFF;
		this.setZN(this.A);
	}

    ASL(data: OpData): void {
		let val = this.memory.read(data);		
		this.setC(val);		
		val <<= 1;
		val &= 0xFF;
		this.memory.write(data, val);		
		this.setZN(val);		
    }
		
    PHP(data: OpData): void {
       this.push(this.P | 0b00110000); 
    }
    
    ANC(data: OpData): void {
        // todo instr
    }
    
    BPL(data: OpData): void {
		if (!(this.P & 0b10000000)) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}	 
    }
    
    CLC(data: OpData): void {	   
	   this.P &= 0b11111110; 
    }
    
    JSR(data: OpData): void {
		this.push16(this.PC-1);
		this.PC = data;
    }
		
    AND(data: OpData): void {
		let val = this.memory.read(data);
		this.A = this.A & val;
		this.setZN(this.A);
    }
        
	RLA(data: OpData): void {
		let temp = this.memory.read(data);
		let add = this.P & 1;
		this.setC(temp);

		temp = ((temp << 1) & 0xFF) + add;
		this.memory.write(data, temp);
		this.A = this.A & temp;
		this.setZN(this.A);		
	}
    
    BIT(data: OpData): void {
		let val = this.memory.read(data);				
		
		this.setO(val);			
		this.setZ(this.A & val);		
		this.setN(val);
    }
	
	ROLA(data: OpData): void {
		let C = this.P & 1;
		let bit = (this.A >> 7) & 1;
		this.P |= bit;

		this.A <<= 1;
		this.A |= C;
		this.A &= 0xFF;
		this.setZN(this.A);
	}

    ROL(data: OpData): void {
		let val = this.memory.read(data);
		let C = this.P & 1;
		this.setC(val);
		
		val = ((val << 1) + C) & 0xFF;	
		this.setZN(val);
		this.memory.write(data, val);
    }
    
    PLP(data: OpData): void {
		this.P = (this.pop() & 0xEF) | 0x20;
    }
    
    BMI(data: OpData): void {		
		if (this.P & 0b10000000) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}		
    }
    
    SEC(data: OpData): void {
       this.P |= 0b00000001; 
    }
    
    RTI(data: OpData): void {        
		this.P = this.pop() & 0xEF | 0x20;
		this.PC = this.pop16();
    }
    
    EOR(data: OpData): void {
	   this.A ^= this.memory.read(data);
	   this.setZN(this.A); 
    }
    
    SRE(data: OpData): void {
		this.P |= this.memory.read(data) & 1;
		this.LSR(data);
		this.EOR(data);
    }
	
	LSRA(data: OpData): void {
		this.P &= 0b11111110 | (this.A & 1);		
		this.A >>= 1;
		this.A &= 0xFF;
		this.setZN(this.A);
	}

    LSR(data: OpData): void {
		let val = this.memory.read(data);
		this.P &= 0b11111110 | (val & 1);
		val >>= 1;
		val &= 0xFF;
		this.memory.write(data, val);
		this.setZN(val);
    }
    
    PHA(data: OpData): void {		
        this.push(this.A);
    }
    
    ALR(data: OpData): void {
        // todo instr
    }
    
    JMP(data: OpData): void {    	
		this.PC = data;
    }
    
    BVC(data: OpData): void {
        if (!(this.P & 0b01000000)) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}	
    }
    
    CLI(data: OpData): void {
		this.P |= 0b11111011;  
    }
    
    RTS(data: OpData): void {
		this.PC = this.pop16() + 1;
    }
    
    ADC(data: OpData): void {
	   let val: any = this.memory.read(data);
	   let C = this.P & 1;
	   let A: any = this.A;
	   let temp = A + val + C;
	   
	   
	   if (temp > 0xFF) {
			this.P |= 1;
	   } else {
			this.P &= 0xFE;
	   }

	   if ((((A ^ val) & 0x80) == 0) && ((temp ^ this.A) & 0x80) != 0) {
			this.P |= 0b01000000;
	   } else {
			this.P &= 0b10111111;
	   }

	   temp &= 0xFF;
	   this.A = temp;	   
	   this.setZN(temp);
    }
    
    RRA(data: OpData): void {
		this.ROR(data);
		this.ADC(data);
        // todo instr
    }
	
	RORA(data: OpData): void {		
		let C = this.P & 1;
		let bit = this.A & 1;
		this.P |= bit;

		this.A >>= 1;
		this.A |= C << 7;
		this.setZN(this.A);
	}

    ROR(data: OpData): void {
		let val = this.memory.read(data);
        let C = this.P & 1;
		let bit = val & 1;
		this.P |= bit;

		val >>= 1;
		val |= C << 7;
		this.setZN(val);
		this.memory.write(data, val);
    }
    
    PLA(data: OpData): void {
	   this.A = this.pop();
	   this.setZN(this.A); 
    }
    
    ARR(data: OpData): void {
        // todo instr
    }
    
    BVS(data: OpData): void {		
		if (this.P & 0b01000000) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}	
    }
    
    SEI(data: OpData): void {
       this.P |= 0b00000100; 
    }
    
    STA(data: OpData): void {		
		this.memory.write(data, this.A);
    }
    
    SAX(data: OpData): void {
       this.memory.write(data, this.A & this.X); 
    }
    
    STY(data: OpData): void {
        this.memory.write(data, this.Y);
    }
    
    STX(data: OpData): void {
        this.memory.write(data, this.X);
    }
    
    DEY(data: OpData): void {
	   this.Y--;
	   this.Y &= 0xFF;
	   this.setZN(this.Y); 
    }
    
    TXA(data: OpData): void {
	   this.A = this.X;
	   this.setZN(this.A); 
    }
    
    XAA(data: OpData): void {
        // todo instr
    }
    
    BCC(data: OpData): void {		
		if (!(this.P & 0b00000001)) {
			this.addPageCycles(this.PC, data);
			this.PC = data;		
		} 
    }
    
    AHX(data: OpData): void {
        // todo instr
    }
    
    TYA(data: OpData): void {
		this.A = this.Y;
		this.setZN(this.A); 
    }
    
    TXS(data: OpData): void {
		this.SP = this.X; 
    }
    
    TAS(data: OpData): void {
        // todo instr
    }
    
    SHY(data: OpData): void {
        // todo instr
    }
    
    SHX(data: OpData): void {
        // todo instr
    }
    
    LDY(data: OpData): void {
		this.Y = this.memory.read(data);
		this.setZN(this.Y);
    }
    
    LDA(data: OpData): void {
		this.A = this.memory.read(data);
		this.setZN(this.A);
    }
    
    LDX(data: OpData): void {
		this.X = this.memory.read(data);
		this.setZN(this.X);
    }
    
    LAX(data: OpData): void {
		let val: OpData = this.memory.read(data);
		this.A = val;
		this.X = val;
		this.setZN(val);		
    }
    
    TAY(data: OpData): void {
	   this.Y = this.A; 
	   this.setZN(this.Y);
    }
    
    TAX(data: OpData): void {
		this.X = this.A;
		this.setZN(this.X);
    }
    
    BCS(data: OpData): void {
		if (this.P & 0b00000001) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}
    }
    
    CLV(data: OpData): void {
       this.P &= 0b10111111; 
    }
    
    TSX(data: OpData): void {
		this.X = this.SP;
		this.setZN(this.X);
    }
    
    LAS(data: OpData): void {
        // todo instr
    }
    
    CPY(data: OpData): void {
		this._cmp(this.Y, this.memory.read(data)); 
    }		

    CMP(data: OpData): void {
        this._cmp(this.A, this.memory.read(data));
    }
    
    DCP(data: OpData): void {
	   let val = this.memory.read(data);
	   let tmp = (val - 1) & 0xFF; 
	   this.memory.write(data, tmp);

	   this.CMP(data);
    }
    
    DEC(data: OpData): void {
		let val: OpData = this.memory.read(data);
		val = (val - 1) & 0xFF;
		this.setZN(val);
		this.memory.write(data, val);
    }
    
    INY(data: OpData): void {
		this.Y ++ ;
		this.Y &= 0xFF;
		this.setZN(this.Y); 
    }
    
    DEX(data: OpData): void {
	   this.X--;
	   this.X &= 0xFF;
	   this.setZN(this.X); 
    }
    
    AXS(data: OpData): void {
        // todo instr
    }
    
    BNE(data: OpData): void {
		if (!(this.P & 0b00000010)) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		} 
    }
    
    CLD(data: OpData): void {
		this.P &= 0b11110111;  
    }
    
    CPX(data: OpData): void {
		this._cmp(this.X, this.memory.read(data)); 
    }
	
	_SBC(val: OpData) {		
		let C = this.P & 1;
		let A: any = this.A;
		let temp = A - val - (1 - C);
		
		
		if (temp >= 0) {
			 this.P |= 1;
		} else {
			 this.P &= 0xFE;
		}

		if ((((A ^ val) & 0x80) != 0) && ((temp ^ this.A) & 0x80) != 0) {
			 this.P |= 0b01000000;
		} else {
			 this.P &= 0b10111111;
		}
 
		this.setZN(temp); 
		temp &= 0xFF;
		this.A = temp;	
	}

    SBC(data: OpData): void {
		let val: number = this.memory.read(data);
		let C = this.P & 1;
		let A: any = this.A;
		let temp = A - val - (1 - C);
		
		
		if (temp >= 0) {
			 this.P |= 1;
		} else {
			 this.P &= 0xFE;
		}

		if ((((A ^ val) & 0x80) != 0) && ((temp ^ this.A) & 0x80) != 0) {
			 this.P |= 0b01000000;
		} else {
			 this.P &= 0b10111111;
		}
 
		this.setZN(temp); 
		temp &= 0xFF;
		this.A = temp;	
    }
    
    ISB(data: OpData): void {
		this.INC(data);
		this._SBC(this.memory.read(data));
    }
    
    INC(data: OpData): void {
		let val: OpData = this.memory.read(data);
		val = (val + 1) & 0xFF;
		this.setZN(val);
		this.memory.write(data, val);
    }
    
    INX(data: OpData): void {
		this.X ++ ;
		this.X &= 0xFF;
		this.setZN(this.X);
	}
		
    BEQ(data: OpData): void {		
		if (this.P & 0b00000010) {
			this.addPageCycles(this.PC, data);
			this.PC = data;
		}		 
    }
    
    SED(data: OpData): void {
		this.P |= 0b00001000;  
    }
    
}