import { parseTemplate } from "./template";
import { whitespaceRE, error, pushChild } from "./util";

const parseAttributes = (index, input, length, attributes, directives, dependencies) => {
  while (index < length) {
    let char = input[index];

    if (char === "/" || char === ">") {
      break;
    } else if (whitespaceRE.test(char)) {
      index += 1;
      continue;
    } else {
      let key = "";
      let argument = "";
      let value = "";
      let expression = false;

      while (index < length) {
        char = input[index];

        if (char === "/" || char === ">" || whitespaceRE.test(char)) {
          value = key;
          break;
        } else if (char === "=") {
          index += 1;
          break;
        } else if (char === ":" && key[0] === "m" && key[1] === "-") {
          argument += input[index + 1];
          index += 2;
        } else if (argument.length !== 0) {
          argument += char;
          index += 1;
        } else {
          key += char;
          index += 1;
        }
      }

      if (value.length === 0) {
        let quote;
        char = input[index];

        if (char === "\"" || char === "'") {
          quote = char;
          index += 1;
        } else if (char === "{") {
          quote = "}";
          expression = true;
          index += 1;
        } else {
          quote = whitespaceRE;
        }

        while (index < length) {
          char = input[index];

          if (char === "/" || char === ">") {
            break;
          } else if ((typeof quote === "object" && quote.test(char)) || char === quote) {
            index += 1;
            break;
          } else {
            value += char;
            index += 1;
          }
        }
      }

      (key[0] === "m" && key[1] === "-" ? directives : attributes).push({
        key: key,
        value: value,
        argument: argument,
        expression: expression,
        dynamic: expression && parseTemplate(value, dependencies)
      });
    }
  }

  return index;
};

export const parseOpeningTag = (index, input, length, stack, dependencies) => {
  let type = "";
  let attributes = [];
  let directives = [];

  while (index < length) {
    const char = input[index];

    if (char === ">") {
      const element = {
        index: stack[0].index++,
        type: type,
        attributes: attributes,
        directives: directives,
        children: []
      };

      pushChild(element, stack);
      stack.push(element);

      index += 1;
      break;
    } else if (char === "/" && input[index + 1] === ">") {
      pushChild({
        index: stack[0].index++,
        type: type,
        attributes: attributes,
        directives: directives,
        children: []
      }, stack);

      index += 2;
      break;
    } else if (whitespaceRE.test(char)) {
      attributes = [];
      directives = [];
      index = parseAttributes(index + 1, input, length, attributes, directives, dependencies);
    } else {
      type += char;
      index += 1;
    }
  }

  return index;
};

export const parseClosingTag = (index, input, length, stack) => {
  let type = "";

  for(; index < length; index++) {
    const char = input[index];

    if (char === ">") {
      index += 1;
      break;
    } else {
      type += char;
    }
  }

  const lastElement = stack.pop();
  if (type !== lastElement.type && process.env.MOON_ENV === "development") {
    error(`Unclosed tag "${lastElement.type}"`);
  }

  return index;
};
