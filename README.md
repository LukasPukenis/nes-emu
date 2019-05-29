This is a NES emulator written in Typescript.
It supports UNROM games such as: Ice Climber, Balloon Fight, Lode Runner, Super Mario Bros 2 and similar ones.

Problem with speed is not Javascript itself however the inability to optimize the code by JS engine inside such a busy loop
so function calls needs to be inlined manually. Most of the CPU is already inlined however call to each function is still - a call. This is tedious work
left for the future self.

TODO:
- [ ] speed
- [ ] audio
- [ ] proper UI with at least configurable input screen
- [ ] networking experiments(maybe run this as a server)
