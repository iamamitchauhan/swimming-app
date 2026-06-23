import { useEffect } from "react";

/**
 * @param {*} ref - Ref of your parent div
 * @param {*} buttonRef - Ref of button div
 * @param {*} callback - Callback which can be used to change your maintained state in your component
 */
const useOutsideClick = (
  ref: React.RefObject<HTMLElement | null>,
  callback: () => void,
  buttonRef?: React.RefObject<HTMLElement | null>,
) => {
  useEffect(() => {
    const handleClickOutside = (evt: { target: EventTarget | null }) => {
      if (
        ref.current &&
        !ref.current.contains(evt.target as Node) &&
        (!buttonRef || !buttonRef.current?.contains(evt.target as Node))
      ) {
        callback(); //Do what you want to handle in the callback
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, callback, buttonRef]);
};

export default useOutsideClick;
