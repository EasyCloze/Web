export default function API(path : string) : string {
  return import.meta.env.VITE_API + path;
}
