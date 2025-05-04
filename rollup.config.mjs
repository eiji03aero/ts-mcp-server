import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
  },
  plugins: [
    resolve({
      exportConditions: ['import'],
      extensions: ['.mjs', '.js', '.json', '.node', '.ts'],
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
    }),
    terser({
      compress: {
        dead_code: true, // Remove dead code
        drop_console: true, // Remove console logs
        drop_debugger: true, // Remove debugger statements
        keep_fargs: false, // Remove unused function arguments
        passes: 2, // Run compression passes multiple times
      },
      mangle: {
        toplevel: true, // Mangle top-level names
        reserved: [], // No reserved names
      },
      format: {
        comments: false, // Remove all comments
      },
    }),
  ],
  treeshake: {
    moduleSideEffects: false, // Aggressive tree shaking
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
};