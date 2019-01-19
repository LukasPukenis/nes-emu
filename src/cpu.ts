import { Memory } from './memory';
import { ROM } from './rom';
import { cpus } from 'os';
import { timingSafeEqual } from 'crypto';

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
    __NO__MODE__,
    modeAbsolute,
	modeAbsoluteX,
	modeAbsoluteY,
	modeAccumulator,
	modeImmediate,
	modeImplied,
	modeIndexedIndirect,
	modeIndirect,
	modeIndirectIndexed,
	modeRelative,
	modeZeroPage,
	modeZeroPageX,
	modeZeroPageY
};

type OpData = number;

type Opcode = {
    name: string,
    cycles: number;
    page_cost: number;
    size: number;
    addr_mode: AddressingModes;
	op: (cpu: CPU, data: OpData) => void;
	displayMemoryContent?: boolean;
	displayIndexedIndirectMemoryContent?: boolean;
	displayZeroPageMemory?: true;
	noData?: boolean;
};


const opcodes: Opcode[] = [
	{ name: "BRK", cycles: 7, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.BRK(data);} },
	{ name: "ORA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SLO", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, displayMemoryContent: true },
	{ name: "ASL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);}, displayMemoryContent: true },
	{ name: "*SLO", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "PHP", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHP(data);}, noData: true },
	{ name: "ORA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ASLA(data);}, noData: true },
	{ name: "ANC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, displayMemoryContent: true },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);}, displayMemoryContent: true },
	{ name: "*SLO", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);}, displayMemoryContent: true },
	{ name: "BPL", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BPL(data);} },
	{ name: "ORA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SLO", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);}, displayZeroPageMemory: true },
	{ name: "ASL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);}, displayZeroPageMemory: true },
	{ name: "*SLO", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);}, displayZeroPageMemory: true },
	{ name: "CLC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLC(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SLO", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ORA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ORA(data);} },
	{ name: "ASL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ASL(data);} },
	{ name: "*SLO", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SLO(data);} },
	{ name: "JSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JSR(data);} },
	{ name: "AND", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RLA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "BIT", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);}, displayMemoryContent: true },
	{ name: "AND", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, displayMemoryContent: true },
	{ name: "ROL", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);}, displayMemoryContent: true },
	{ name: "*RLA", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "PLP", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLP(data);}, noData: true },
	{ name: "AND", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.ROLA(data);}, noData: true},
	{ name: "ANC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ANC(data);} },
	{ name: "BIT", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.BIT(data);}, displayMemoryContent: true },
	{ name: "AND", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, displayMemoryContent: true },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);}, displayMemoryContent: true },
	{ name: "*RLA", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);}, displayMemoryContent: true },
	{ name: "BMI", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BMI(data);} },
	{ name: "AND", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RLA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.AND(data);}, displayZeroPageMemory: true },
	{ name: "ROL", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);}, displayZeroPageMemory: true },
	{ name: "*RLA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);}, displayZeroPageMemory: true },
	{ name: "SEC", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEC(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*RLA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "AND", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.AND(data);} },
	{ name: "ROL", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROL(data);} },
	{ name: "*RLA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RLA(data);} },
	{ name: "RTI", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTI(data);}, noData: true },
	{ name: "EOR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SRE", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, displayMemoryContent: true },
	{ name: "LSR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);}, displayMemoryContent: true },
	{ name: "*SRE", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "PHA", cycles: 3, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PHA(data);}, noData: true },
	{ name: "EOR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.LSRA(data);}, noData: true },
	{ name: "ALR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ALR(data);} },
	{ name: "JMP", cycles: 3, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);} },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, displayMemoryContent: true },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);}, displayMemoryContent: true },
	{ name: "*SRE", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);}, displayMemoryContent: true },
	{ name: "BVC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BVC(data);} },
	{ name: "EOR", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*SRE", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);}, displayZeroPageMemory: true },
	{ name: "LSR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);}, displayZeroPageMemory: true },
	{ name: "*SRE", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);}, displayZeroPageMemory: true },
	{ name: "CLI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLI(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SRE", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "EOR", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.EOR(data);} },
	{ name: "LSR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LSR(data);} },
	{ name: "*SRE", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SRE(data);} },
	{ name: "RTS", cycles: 6, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.RTS(data);}, noData: true },
	{ name: "ADC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RRA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, displayMemoryContent: true },
	{ name: "ROR", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);}, displayMemoryContent: true },
	{ name: "*RRA", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "PLA", cycles: 4, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.PLA(data);}, noData: true },
	{ name: "ADC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR A", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeAccumulator, op:(cpu: CPU, data: OpData) => { cpu.RORA(data);}, noData: true },
	{ name: "ARR", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.ARR(data);} },
	{ name: "JMP", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeIndirect, op:(cpu: CPU, data: OpData) => { cpu.JMP(data);} },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, displayMemoryContent: true },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);}, displayMemoryContent: true },
	{ name: "*RRA", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);}, displayMemoryContent: true },
	{ name: "BVS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BVS(data);} },
	{ name: "ADC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*RRA", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);}, displayZeroPageMemory: true },
	{ name: "ROR", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);}, displayZeroPageMemory: true },
	{ name: "*RRA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);}, displayZeroPageMemory: true },
	{ name: "SEI", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SEI(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*RRA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "ADC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ADC(data);} },
	{ name: "ROR", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ROR(data);} },
	{ name: "*RRA", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.RRA(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SAX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "STY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STY(data);}, displayMemoryContent: true },
	{ name: "STA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, displayMemoryContent: true },
	{ name: "STX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.STX(data);}, displayMemoryContent: true },
	{ name: "*SAX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);} },
	{ name: "DEY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEY(data);}, noData: true },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "TXA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXA(data);}, noData: true },
	{ name: "XAA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.XAA(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STY(data);}, displayMemoryContent: true },
	{ name: "STA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, displayMemoryContent: true },
	{ name: "STX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.STX(data);}, displayMemoryContent: true },
	{ name: "*SAX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);}, displayMemoryContent: true },
	{ name: "BCC", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BCC(data);} },
	{ name: "STA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "AHX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "STY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.STY(data);}, displayZeroPageMemory: true },
	{ name: "STA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.STA(data);}, displayZeroPageMemory: true },
	{ name: "STX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.STX(data);}, displayZeroPageMemory: true },
	{ name: "*SAX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.SAX(data);}, displayZeroPageMemory: true },
	{ name: "TYA", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TYA(data);}, noData: true },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "TXS", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TXS(data);}, noData: true },
	{ name: "TAS", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.TAS(data);}, noData: true },
	{ name: "SHY", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SHY(data);} },
	{ name: "STA", cycles: 5, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.STA(data);} },
	{ name: "SHX", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SHX(data);} },
	{ name: "AHX", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.AHX(data);} },
	{ name: "LDY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "LDX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "*LAX", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "LDY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);}, displayMemoryContent: true },
	{ name: "LDA", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, displayMemoryContent: true },
	{ name: "LDX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);}, displayMemoryContent: true },
	{ name: "*LAX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "TAY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAY(data);}, noData: true },
	{ name: "LDA", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TAX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TAX(data);}, noData: true },
	{ name: "*LAX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);}, displayMemoryContent: true },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, displayMemoryContent: true },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);}, displayMemoryContent: true },
	{ name: "*LAX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);}, displayMemoryContent: true },
	{ name: "BCS", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BCS(data);} },
	{ name: "LDA", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*LAX", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "LDY", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);}, displayZeroPageMemory: true },
	{ name: "LDA", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);}, displayZeroPageMemory: true },
	{ name: "LDX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);}, displayZeroPageMemory: true },
	{ name: "*LAX", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageY, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);}, displayZeroPageMemory: true },
	{ name: "CLV", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLV(data);}, noData: true },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "TSX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.TSX(data);}, noData: true },
	{ name: "LAS", cycles: 4, page_cost: 1, size: 2, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAS(data);} },
	{ name: "LDY", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDY(data);} },
	{ name: "LDA", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.LDA(data);} },
	{ name: "LDX", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LDX(data);} },
	{ name: "*LAX", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.LAX(data);} },
	{ name: "CPY", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);} },
	{ name: "CMP", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*DCP", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "CPY", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);}, displayMemoryContent: true },
	{ name: "CMP", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, displayMemoryContent: true },
	{ name: "DEC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);}, displayMemoryContent: true },
	{ name: "*DCP", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "INY", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INY(data);}, noData: true },
	{ name: "CMP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.DEX(data);}, noData: true },
	{ name: "AXS", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.AXS(data);} },
	{ name: "CPY", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPY(data);}, displayMemoryContent: true },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, displayMemoryContent: true },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);}, displayMemoryContent: true },
	{ name: "*DCP", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);}, displayMemoryContent: true },
	{ name: "BNE", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BNE(data);} },
	{ name: "CMP", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*DCP", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);}, displayZeroPageMemory: true },
	{ name: "DEC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);}, displayZeroPageMemory: true },
	{ name: "*DCP", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);}, displayZeroPageMemory: true },
	{ name: "CLD", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.CLD(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*DCP", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "CMP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.CMP(data);} },
	{ name: "DEC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DEC(data);} },
	{ name: "*DCP", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.DCP(data);} },
	{ name: "CPX", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);} },
	{ name: "SBC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*ISB", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndexedIndirect, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);}, displayIndexedIndirectMemoryContent: true },
	{ name: "CPX", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);}, displayMemoryContent: true },
	{ name: "SBC", cycles: 3, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, displayMemoryContent: true },
	{ name: "INC", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.INC(data);}, displayMemoryContent: true },
	{ name: "*ISB", cycles: 5, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPage, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "INX", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.INX(data);}, noData: true },
	{ name: "SBC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*SBC", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImmediate, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "CPX", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.CPX(data);}, displayMemoryContent: true },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, displayMemoryContent: true },
	{ name: "INC", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.INC(data);}, displayMemoryContent: true },
	{ name: "*ISB", cycles: 6, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsolute, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);}, displayMemoryContent: true },
	{ name: "BEQ", cycles: 2, page_cost: 1, size: 2, addr_mode: AddressingModes.modeRelative, op:(cpu: CPU, data: OpData) => { cpu.BEQ(data);} },
	{ name: "SBC", cycles: 5, page_cost: 1, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "KIL", cycles: 2, page_cost: 0, size: 2, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.KIL(data);} },
	{ name: "*ISB", cycles: 8, page_cost: 0, size: 2, addr_mode: AddressingModes.modeIndirectIndexed, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);}, displayZeroPageMemory: true },
	{ name: "INC", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.INC(data);}, displayZeroPageMemory: true },
	{ name: "*ISB", cycles: 6, page_cost: 0, size: 2, addr_mode: AddressingModes.modeZeroPageX, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);}, displayZeroPageMemory: true },
	{ name: "SED", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.SED(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "*NOP", cycles: 2, page_cost: 0, size: 1, addr_mode: AddressingModes.modeImplied, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "*ISB", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteY, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} },
	{ name: "*NOP", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.NOP(data);}, noData: true },
	{ name: "SBC", cycles: 4, page_cost: 1, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.SBC(data);} },
	{ name: "INC", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.INC(data);} },
	{ name: "*ISB", cycles: 7, page_cost: 0, size: 3, addr_mode: AddressingModes.modeAbsoluteX, op:(cpu: CPU, data: OpData) => { cpu.ISB(data);} }	
];

const AddressDecoders: any = {
    [AddressingModes.modeAbsolute]: (opcode: Opcode, cpu: CPU) => { return cpu.memory.read16(cpu.PC + 1); },
    [AddressingModes.modeAbsoluteX]: (opcode: Opcode, cpu: CPU) => { return 0xFFFF & (cpu.memory.read16(cpu.PC+1) + cpu.X); },
    [AddressingModes.modeAbsoluteY]: (opcode: Opcode, cpu: CPU) => { return 0xFFFF & (cpu.memory.read16(cpu.PC+1) + cpu.Y); },
    [AddressingModes.modeAccumulator]: (opcode: Opcode, cpu: CPU) => { return 0; },
    [AddressingModes.modeImmediate]: (opcode: Opcode, cpu: CPU) => {
		return cpu.PC + 1;
	},
	[AddressingModes.modeImplied]: (opcode: Opcode, cpu: CPU) => { return 0; },	
    [AddressingModes.modeIndexedIndirect]: (opcode: Opcode, cpu: CPU) => {
		return cpu.memory.read16bug(0xFF & (cpu.memory.read(cpu.PC + 1) + cpu.X));
	},
    [AddressingModes.modeIndirect]: (opcode: Opcode, cpu: CPU) => {		
		return cpu.memory.read16bug(cpu.memory.read16(cpu.PC + 1));
	},
	[AddressingModes.modeIndirectIndexed]: (opcode: Opcode, cpu: CPU) => {
		let val = cpu.memory.read16bug(0xFF & (cpu.memory.read(cpu.PC + 1) & 0xFF)) + cpu.Y;
		return val & 0xFFFF;		
	},
    [AddressingModes.modeRelative]: (opcode: Opcode, cpu: CPU) => { let offset = cpu.memory.read(cpu.PC + 1); if (offset < 0x80) { return offset + cpu.PC + 2; } else { return offset + cpu.PC + 2 - 0x100;}},
    [AddressingModes.modeZeroPage]: (opcode: Opcode, cpu: CPU) => { return 0xFF & cpu.memory.read(cpu.PC + 1); },
    [AddressingModes.modeZeroPageX]: (opcode: Opcode, cpu: CPU) => { return 0xFF & cpu.memory.read(cpu.PC + 1) + cpu.X; },
    [AddressingModes.modeZeroPageY]: (opcode: Opcode, cpu: CPU) => { return 0xFF & cpu.memory.read(cpu.PC + 1) + cpu.Y; }
};

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

export class CPU {
    memory: Memory;
    A:  Register;
    X:  Register;
    Y:  Register;
    PC: Register;
    SP:  Register;
    P:  Register;
    cycles: number;
    rom: ROM;
	debugOpcode: any[];
	currentOpcode: Opcode;
	currentData: any;

    constructor(rom: ROM) {
        this.A = 0;
        this.X = 0;
        this.Y = 0;
        this.SP = 0xFD;
        this.P = 0x24; // it can be 0x34 or 0x24 as the fifth bit is ignored/reserved
        this.PC = 0;

        this.cycles = 0;
        this.memory = new Memory();
        this.rom = rom;

        let prgrom = this.rom.getPRGROMS()[0];
        console.assert(prgrom.length == 0x4000, prgrom.length, 0x4000);
        
        for (let i = 0; i < prgrom.length; i++) {
            this.memory.write(0xC000+i, prgrom[i]);
        }
        
        this.PC = 0xC000;
	}
	
	prettyHex(data: number, padStart = 4) {
		return data.toString(16).toUpperCase().padStart(padStart, '0');
	}
	
	decode() {
		let opcode = opcodes[this.memory.read(this.PC)];		
		let opcodeData: OpData = AddressDecoders[opcode.addr_mode](opcode, this);		
		let data: OpData = opcodeData;
		this.currentData = opcodeData;
		this.currentOpcode = opcode;
		
		// immediate mode receives address to direct data in next byte(s), so just read it for display purposes
		if (opcode.addr_mode == AddressingModes.modeImmediate)
			data = this.memory.read(opcodeData);

		let prefix = AddressDecodersPrefix[opcode.addr_mode];
	
		let output: string[] = [];
		output.push(this.PC.toString(16).toUpperCase().padStart(4, '0'));		

		let _data = [];
		for (let i = 0; i < opcode.size; i++)
			_data.push(this.memory.read(this.PC + i).toString(16).toUpperCase().padStart(2, '0'));		

		output.push(_data.join(' '));

		let instruction = opcode.name;
				
		if (!opcode.noData &&
			opcode.addr_mode != AddressingModes.modeIndexedIndirect &&
			opcode.addr_mode != AddressingModes.modeIndirectIndexed &&
			opcode.addr_mode != AddressingModes.modeIndirect &&
			opcode.addr_mode != AddressingModes.modeAbsoluteX &&
			opcode.addr_mode != AddressingModes.modeAbsoluteY &&
			opcode.addr_mode != AddressingModes.modeZeroPageX &&
			opcode.addr_mode != AddressingModes.modeZeroPageY) {
			let size = 2;
			if (opcode.addr_mode == AddressingModes.modeAbsolute)
				size = 4;

			instruction += ' '+ prefix + data.toString(16).toUpperCase().padStart(size, '0');
		}
		
		if (!opcode.noData) {
			if (opcode.displayMemoryContent) {
				instruction += ' = ' + this.memory.read(data).toString(16).toUpperCase().padStart(2, '0');
			}
			
			if (opcode.addr_mode == AddressingModes.modeAbsoluteX) {
				let addr = this.memory.read16(this.PC + 1);
				let val = this.memory.read(0xFFFF & (addr + this.X));
				instruction += ` $${this.prettyHex(addr)} X @ ${this.prettyHex(data)} = ${this.prettyHex(val, 2)}`;
			}

			if (opcode.addr_mode == AddressingModes.modeAbsoluteY) {
				let addr = this.memory.read16(this.PC + 1);			
				// let val = this.memory.read(data);					
				let val = this.memory.read(0xFFFF & (addr + this.Y));	
				instruction += ` $${this.prettyHex(addr)} Y @ ${this.prettyHex(data)} = ${this.prettyHex(val, 2)}`;			
			}

			if (opcode.addr_mode == AddressingModes.modeIndirect) {
				let addr = this.memory.read16(this.PC + 1);
				let val = addr;

				instruction += ` ($${this.prettyHex(addr)}) = ${this.prettyHex(data)}`;
			}

			if (opcode.addr_mode == AddressingModes.modeZeroPageX) {
				let addr = this.memory.read(this.PC + 1);
				let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
				let finalAddr = (addr+this.X) & 0xFF;
				let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

				instruction += ` $${addrStr} X @ ${finalAddrStr}`;			
				instruction += ' = ' + this.memory.read(data).toString(16).toUpperCase().padStart(2, '0');			
			}

			if (opcode.addr_mode == AddressingModes.modeZeroPageY) {
				let addr = this.memory.read(this.PC + 1);
				let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
				let finalAddr = (addr+this.Y) & 0xFF;
				let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

				instruction += ` $${addrStr} Y @ ${finalAddrStr}`;			
				instruction += ' = ' + this.memory.read(data).toString(16).toUpperCase().padStart(2, '0');			
			}

			if (opcode.addr_mode == AddressingModes.modeIndirectIndexed) {
				let addr = this.memory.read(this.PC + 1);
				
				let addrStr = this.prettyHex(addr, 2);
				let val = this.memory.read16bug((this.memory.read(this.PC + 1) & 0xFF));
				
				instruction += ` ($${addrStr}) Y`;
				instruction += ' = ' + (val).toString(16).toUpperCase().padStart(4, '0');			
				instruction += ' @ ' + data.toString(16).toUpperCase().padStart(4, '0');			
				instruction += ' = ' + this.memory.read(data).toString(16).toUpperCase().padStart(2, '0');						
			}

			if (opcode.displayIndexedIndirectMemoryContent) {
				let addr = this.memory.read(this.PC + 1);

				let addrStr = addr.toString(16).toUpperCase().padStart(2, '0');
				let finalAddr = (addr+this.X) & 0xFF;
				let finalAddrStr = finalAddr.toString(16).toUpperCase().padStart(2, '0');

				instruction += ` ($${addrStr} X) @ ${finalAddrStr}`;
				instruction += ' = ' + data.toString(16).toUpperCase().padStart(4, '0');			
				instruction += ' = ' + this.memory.read(data).toString(16).toUpperCase().padStart(2, '0');			
			}
		}

		output.push(instruction);
		output.push('A:' + this.A.toString(16).toUpperCase().padStart(2, '0'));
		output.push('X:' + this.X.toString(16).toUpperCase().padStart(2, '0'));
		output.push('Y:' + this.Y.toString(16).toUpperCase().padStart(2, '0'));
		output.push('P:' + this.P.toString(16).toUpperCase().padStart(2, '0'));
		output.push('SP:' + this.SP.toString(16).toUpperCase().padStart(2, '0'));		
		
		this.debugOpcode = output;
	}

    step() {        
		this.decode();

		let opcode = this.currentOpcode;
		let data = this.currentData;

        this.PC += opcode.size;
		this.cycles += opcode.cycles;
		
		opcode.op(this, data);		
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
    
    // RLA(data: OpData): void {
	// 	this.setC(this.memory.read(data));
		
	// 	console.log("==== RLA ====");
	// 	console.log(`data: ${this.prettyHex(data)}`);
	// 	console.log(`[data]: ${this.prettyHex(this.memory.read(data))}`);
	// 	console.log(`this.A: ${this.prettyHex(this.A)}`);		
		
	// 	this.ROL(data);
		
	// 	console.log(`[data] after rol: ${this.prettyHex(this.memory.read(data))}`);
	// 	console.log(`this.A after rol: ${this.prettyHex(this.A)}`);
		
	// 	this.AND(data);
		
	// 	console.log(`this.A after end: ${this.prettyHex(this.A)}`);
	// }
	
	RLA(data: OpData): void { // todo: why the fuck doesn it work with the implementation above!!!!!
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
			this.PC = data;
		}		 
    }
    
    SED(data: OpData): void {
		this.P |= 0b00001000;  
    }
    
}