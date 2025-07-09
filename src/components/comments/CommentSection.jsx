import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { getComments, addComment, addCommentReply, voteComment } from '../../lib/supabase';
import CommentItem from './CommentItem';
import AuthModal from '../auth/AuthModal';

const { FiMessageSquare, FiRefreshCw } = FiIcons;

const CommentSection = ({ alert, user }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger refreshes

  useEffect(() => {
    loadComments();
  }, [alert, refreshKey]);

  const loadComments = async () => {
    if (!alert) return;
    
    setLoading(true);
    try {
      const { data, error } = await getComments(alert.id);
      if (error) throw error;

      // Organize comments into a tree structure
      const commentMap = {};
      const rootComments = [];

      // First pass: create map of all comments
      data.forEach(comment => {
        comment.replies = [];
        commentMap[comment.id] = comment;
      });

      // Second pass: organize into tree
      data.forEach(comment => {
        if (comment.parent_id) {
          // This is a reply, add it to its parent
          const parent = commentMap[comment.parent_id];
          if (parent) {
            parent.replies.push(comment);
          }
        } else {
          // This is a root comment
          rootComments.push(comment);
        }
      });

      setComments(rootComments);
    } catch (err) {
      console.error('Error loading comments:', err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    // If not logged in, show auth modal
    if (!user && !isAnonymous) {
      setShowAuthModal(true);
      return;
    }

    try {
      await addComment(
        alert.id,
        newComment,
        user?.id,
        user?.email?.split('@')[0] || 'Anonymous',
        !user || isAnonymous
      );
      setNewComment('');
      // Refresh comments
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  const handleReply = async (parentId, content) => {
    // If not logged in, show auth modal
    if (!user && !isAnonymous) {
      setShowAuthModal(true);
      return false;
    }

    try {
      await addCommentReply(
        parentId,
        alert.id,
        content,
        user?.id,
        user?.email?.split('@')[0] || 'Anonymous',
        !user || isAnonymous
      );
      // Refresh comments
      setRefreshKey(prev => prev + 1);
      return true;
    } catch (err) {
      console.error('Error adding reply:', err);
      setError('Failed to add reply');
      return false;
    }
  };

  const handleVote = async (commentId, voteType) => {
    // If not logged in, show auth modal
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      await voteComment(commentId, user.id, voteType);
      // Refresh comments
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error('Error voting on comment:', err);
      setError('Failed to vote on comment');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiMessageSquare} className="text-indigo-600 text-xl" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Discussion
              </h2>
              <p className="text-sm text-gray-600">
                {comments.length} comment{comments.length !== 1 ? 's' : ''} on this alert
              </p>
            </div>
          </div>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiRefreshCw} className="text-gray-600" />
            <span className="font-medium text-gray-700">Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Comment form */}
        <form onSubmit={handleSubmitComment} className="mb-8">
          <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-microsoft-blue focus-within:border-microsoft-blue">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full px-4 py-3 border-none focus:outline-none resize-none"
              rows="3"
            />
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
              <div className="flex items-center">
                {!user && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={() => setIsAnonymous(!isAnonymous)}
                      className="rounded text-microsoft-blue focus:ring-microsoft-blue"
                    />
                    <span className="text-sm text-gray-600">Post anonymously</span>
                  </label>
                )}
              </div>
              <div className="flex items-center gap-3">
                {!user && !isAnonymous && (
                  <button
                    type="button"
                    onClick={() => setShowAuthModal(true)}
                    className="px-3 py-1.5 text-sm text-microsoft-blue hover:underline"
                  >
                    Sign in to comment
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="px-4 py-1.5 bg-microsoft-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Post Comment
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Comments list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-microsoft-blue"></div>
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                user={user}
                onReply={handleReply}
                onVote={handleVote}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiMessageSquare} className="text-gray-400 text-2xl" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 mb-1">No comments yet</h3>
            <p className="text-gray-600">Be the first to share your thoughts on this alert</p>
          </div>
        )}
      </div>

      {/* Auth modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode="login"
      />
    </div>
  );
};

export default CommentSection;