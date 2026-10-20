import { BuiltinCompletionProvider } from "./BuiltinCompletionProvider";
import { CompletionEngine } from "./CompletionEngine";
import { DirectiveCompletionProvider } from "./DirectiveCompletionProvider";
import { DirectiveParamCompletionProvider } from "./DirectiveParamCompletionProvider";
import { GeneralSymbolCompletionProvider } from "./GeneralSymbolCompletionProvider";
import { NsCompletionProvider } from "./NsCompletionProvider";
import { SpecialVarCompletionProvider } from "./SpecialVarCompletionProvider";

export const defaultCompletionEngine = new CompletionEngine([
  new DirectiveCompletionProvider(),
  new BuiltinCompletionProvider(),
  new SpecialVarCompletionProvider(),
  new NsCompletionProvider(),
  new DirectiveParamCompletionProvider(),
  new GeneralSymbolCompletionProvider(),
]);
