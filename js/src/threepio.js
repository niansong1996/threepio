import mappedCommands from '../../static/mapped_commands_torch_tfjs.json';
import { translationMissing } from './_errors';
import { NORMALIZATION_REGEX } from './_constants';
import Command from './command';

export default class Threepio {
  constructor(from, to, framework, version) {
    this.fromLang = from;
    this.toLang = to;
    this.version = version;
    this.mappedCommands = mappedCommands;
    this.framework = framework;
  }

  _normalizeFunctionName(name, lang) {
    const result = name
      .match(NORMALIZATION_REGEX)
      .join('')
      .toLowerCase();

    if (result in this.mappedCommands[lang]) {
      return result;
    }

    throw new Error(translationMissing(name));
  }

  _orderArgs(cmd, fromInfo, toInfo) {
    const newArgs = [];
    for (const [i, arg] of cmd.args.entries()) {
      const fArg = fromInfo.args[i];
      const tArgIndex = toInfo.args.findIndex(
        a => a.name === fArg[this.toLang]
      );
      if (tArgIndex === -1) {
        newArgs.push(arg);
        continue;
      }

      newArgs.splice(tArgIndex, 0, arg);
    }

    for (const [k, v] of Object.entries(cmd.kwargs)) {
      const fArg = fromInfo.args.filter(a => a.name === k)[0];
      const tArgIndex = toInfo.args.findIndex(
        a => a.name === fArg[this.toLang]
      );

      if (tArgIndex === -1) {
        // throw warning for kwarg translation missing
        console.warn(
          `Unable to translare kwarg ${k} for command ${cmd.functionName}`
        );
        continue;
      }

      newArgs.splice(tArgIndex, 0, v);
    }

    return newArgs;
  }

  translate(cmd) {
    const fromInfo = this.mappedCommands[this.fromLang][
      this._normalizeFunctionName(cmd.functionName, this.fromLang)
    ];
    const toInfo = this.mappedCommands[this.toLang][
      this._normalizeFunctionName(fromInfo[this.toLang], this.toLang)
    ];

    const attrs = [...toInfo.attrs];
    attrs.shift();
    let translatedCmd = this.framework;
    while (attrs.length > 0) {
      translatedCmd = translatedCmd[attrs.shift()];
    }

    const args = this._orderArgs(cmd, fromInfo, toInfo);

    return new Command(toInfo.name, args, {}, translatedCmd);
  }
}
