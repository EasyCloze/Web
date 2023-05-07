import { useContext } from "react";
import LanguageContext from './context';

export default function Text({ id }) {
  const { dict } = useContext(LanguageContext);
  return dict[id];
};
