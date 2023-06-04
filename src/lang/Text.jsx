import { useContext } from "react";
import LanguageContext from './context';

export default function ({ id }) {
  const { dict } = useContext(LanguageContext);
  return dict[id];
};
