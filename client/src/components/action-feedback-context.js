import { createContext, useContext } from "react";

export const FeedbackContext = createContext(null);

export function useActionFeedback() {
  const feedback = useContext(FeedbackContext);
  if (!feedback) throw new Error("ActionFeedbackProvider is missing");
  return feedback;
}
