let fs = require('fs');

module.exports = {
    instantiate: async function(imports) {
        let fizz;
        let buzz;
        let fizzbuzz;


        // Loads specified modules
        async function loadModule(path, wrappedImports) {
            let contents = fs.readFileSync(path);
            let wasm = await WebAssembly.instantiate(contents, wrappedImports);
            return wasm.instance.exports;
        }

        // Nontrivial adapter instructions
        function memToString(memory, ptr, len) {
            let u8 = new Uint8Array(memory.buffer);
            let str = '';
            for (var i = 0; i < len; ++i) {
                str += String.fromCharCode(u8[ptr + i]);
            }
            return str;
        }
        function stringToMem(memory, str, ptr) {
            let u8 = new Uint8Array(memory.buffer);
            let len = str.length;
            for (var i = 0; i < len; ++i) {
                u8[ptr + i] = str.charCodeAt(i);
            }
            return len;
        }

        function fizzStr() {
            let x0 = fizz["fizzStr"]();
            return memToString(fizz["memory"], x0, fizz["_it_strlen"](x0));
        };
        function buzzStr() {
            let x0 = buzz["buzzStr"]();
            return memToString(buzz["memory"], x0, buzz["_it_strlen"](x0));
        };
        function fizzbuzz_cppToString(x0) {
            return memToString(fizzbuzz["memory"], x0, fizzbuzz["_it_strlen"](x0));
        };
        function fizzbuzz_stringToCpp(x0) {
            let x1 = x0.length;
            let x2 = fizzbuzz["malloc"]((x1 + 1));
            stringToMem(fizzbuzz["memory"], x0, x2);
            fizzbuzz["_it_writeStringTerm"](x2, x1);
            return x2;
        };

        let itRuntime = {
            "string-len": (x) => x,
            "mem-to-string": (memID, ptr, len) => 0,
            "string-to-mem": (memID, str, ptr) => {},
            table: new WebAssembly.Table({ element: "anyfunc", initial: 3 }),
        };

        fizz = await loadModule("out/fizz.wasm", {
        });
        buzz = await loadModule("out/buzz.wasm", {
        });

        let pre = await loadModule('out/pre.wasm', {
            buzz,
            _it: itRuntime,
        });
        fizzbuzz = await loadModule("out/fizzbuzz.wasm", {
            buzz: pre,
            console: {
                "log": function(x0) {
                    imports["console"]["log"](fizzbuzz_cppToString(x0));
                },
                "logInt": function(x0) {
                    imports["console"]["logInt"](x0);
                },
            },
            fizz: {
                "isFizz": function(x0) {
                    return fizz["isFizz"](x0);
                },
                "fizzStr": function() {
                    return fizzbuzz_stringToCpp(fizzStr());
                },
            },
        });
        console.log(fizzbuzz);
        itRuntime.table.set(1, fizzbuzz.malloc);
        itRuntime.table.set(2, fizzbuzz._it_writeStringTerm);

        let wrappedExports = {
            "fizzbuzz": function(x0) {
                fizzbuzz["fizzbuzz"](x0);
            },
        };

        return wrappedExports;
    },
};