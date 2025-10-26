import { useContext } from "react";
import { LanguageContext } from './Context';

export default function ({ id }) {
  const { dict } = useContext(LanguageContext);
  return dict[id];
};
