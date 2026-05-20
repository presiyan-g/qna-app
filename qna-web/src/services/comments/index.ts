export {
  listQuestionComments,
  postComment,
  softDeleteComment,
} from './comments';

export {
  CommentNotFoundError,
  CommentPermissionError,
  CommentValidationError,
} from './errors';

export {
  buildCommentThread,
  type CommentThreadRow,
  type QuestionComment,
} from './thread';

export {
  canListQuestionComments,
  canPostQuestionComment,
  canSoftDeleteQuestionComment,
} from './policy';

export { validateCommentBody } from './validation';
