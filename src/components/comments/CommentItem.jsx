import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { formatDistanceToNow } from 'date-fns';

const { FiChevronUp, FiChevronDown, FiMessageSquare, FiUser } = FiIcons;

const CommentItem = ({ comment, user, onReply, onVote, depth = 0 }) => {
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    if (!replyContent.trim()) return;
    
    setIsSubmitting(true);
    const success = await onReply(comment.id, replyContent, isAnonymous);
    
    if (success) {
      setReplyContent('');
      setIsReplying(false);
    }
    
    setIsSubmitting(false);
  };

  const getVoteCount = () => {
    // In a real app, this would come from a votes table in the database
    // For demo purposes, we'll use a random number
    return Math.floor(Math.random() * 20) - 5;
  };

  const voteCount = getVoteCount();

  return (
    <div className={`pl-${depth * 4} relative`}>
      {/* Nested reply line */}
      {depth > 0 && (
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"></div>
      )}
      
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${depth > 0 ? 'ml-4' : ''}`}>
        <div className="flex items-start gap-3">
          {/* Vote controls */}
          <div className="flex flex-col items-center gap-1">
            <button 
              onClick={() => onVote(comment.id, 'up')}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
            >
              <SafeIcon icon={FiChevronUp} />
            </button>
            <span className={`text-xs font-medium ${voteCount > 0 ? 'text-green-600' : voteCount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {voteCount}
            </span>
            <button 
              onClick={() => onVote(comment.id, 'down')}
              className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 hover:text-gray-700"
            >
              <SafeIcon icon={FiChevronDown} />
            </button>
          </div>
          
          <div className="flex-1">
            {/* Comment header */}
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center">
                <SafeIcon icon={FiUser} className="text-gray-600 text-xs" />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {comment.username || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at))} ago
              </span>
            </div>
            
            {/* Comment content */}
            <div className="text-sm text-gray-700 mb-3">
              {comment.content}
            </div>
            
            {/* Comment actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <SafeIcon icon={FiMessageSquare} className="text-gray-400" />
                Reply
              </button>
            </div>
            
            {/* Reply form */}
            {isReplying && (
              <form onSubmit={handleReplySubmit} className="mt-3">
                <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-1 focus-within:ring-microsoft-blue focus-within:border-microsoft-blue">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full px-3 py-2 border-none focus:outline-none resize-none text-sm"
                    rows="2"
                  />
                  <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50">
                    <div className="flex items-center">
                      {!user && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={() => setIsAnonymous(!isAnonymous)}
                            className="rounded text-microsoft-blue focus:ring-microsoft-blue h-3 w-3"
                          />
                          <span className="text-xs text-gray-600">Post anonymously</span>
                        </label>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!replyContent.trim() || isSubmitting}
                        className="px-3 py-1 bg-microsoft-blue text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {isSubmitting ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      
      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              user={user}
              onReply={onReply}
              onVote={onVote}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;