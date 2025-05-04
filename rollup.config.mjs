import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    resolve({
      exportConditions: ['import'],
      extensions: ['.mjs', '.js', '.json', '.node', '.ts']
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
    })
  ],
};