'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { Artifact } from './StudioPanel';
import FlashcardViewer from './FlashcardViewer';
import QuizCard from './QuizCard';
import MindMapViewer from './MindMapViewer';
import InfographicViewer from './InfographicViewer';
import CourseCard, { CourseInfo } from './CourseCard';
import { extractCoursesFromMarkdown } from '../../lib/courseParser';
import BoardPickerModal from '../study-board/BoardPickerModal';
import renderMindmap from '@/lib/mindmapClient';

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact, onClose, onEdit, onDelete }) => {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);

  const canAddToBoard = artifact.type === 'mindmap' || artifact.type === 'infographic';

  const handleAddToBoardClick = () => {
    if (!canAddToBoard) return;
    setIsBoardPickerOpen(true);
  };

  const handleSelectBoard = (boardId: string) => {
    if (!canAddToBoard) return;
    try {
      console.log('=== handleSelectBoard DEBUG ===');
      console.log('Artifact type:', artifact.type);
      console.log('Artifact.data:', artifact.data);
      console.log('Has artifact.data.svgBase64:', !!artifact.data?.svgBase64);
      console.log('Has artifact.data.mermaidCode:', !!artifact.data?.mermaidCode);
      
      const payload =
        artifact.type === 'mindmap'
          ? { 
              kind: 'mindmap' as const, 
              data: artifact.data,
              title: artifact.title,
              svgBase64: artifact.data?.svgBase64
            }
          : { kind: 'infographic' as const, data: artifact.data, title: artifact.title };

      console.log('Payload being stored:', payload);
      sessionStorage.setItem(`board-${boardId}-import`, JSON.stringify(payload));
      console.log('Payload stored in sessionStorage with key:', `board-${boardId}-import`);
    } catch (e) {
      console.error('Failed to store board import payload:', e);
    }
    setIsBoardPickerOpen(false);
    router.push(`/study-board/${boardId}`);
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    console.log('=== EXPORT DEBUG ===');
    console.log('Artifact type:', artifact.type);
    console.log('Artifact data:', artifact.data);
    console.log('Has data.svgBase64:', !!artifact.data?.svgBase64);
    console.log('Has data.mermaidCode:', !!artifact.data?.mermaidCode);
    
    try {
      // For mindmaps, export as SVG image
      if (artifact.type === 'mindmap') {
        let svgBase64 = artifact.data?.svgBase64;
        
        // If we have mermaid code but no SVG, render it with mermaid library
        if (!svgBase64 && artifact.data?.mermaidCode) {
          console.log('Have mermaid code, rendering to SVG with mermaid library...');
          try {
            const mermaidModule = await import('mermaid');
            const mermaid = (mermaidModule as any).default || mermaidModule;
            if (mermaid) {
              mermaid.initialize({ startOnLoad: false });
              const id = 'export_' + Math.random().toString(36).slice(2, 9);
              const { svg } = await mermaid.render(id, artifact.data.mermaidCode);
              
              // Convert SVG string to base64
              svgBase64 = btoa(svg);
              console.log('Successfully rendered mermaid to SVG, length:', svgBase64.length);
            }
          } catch (mermaidError) {
            console.error('Mermaid rendering failed:', mermaidError);
          }
        }
        
        // If still no SVG, try rendering from mindmap data
        if (!svgBase64 && artifact.data) {
          console.log('No cached SVG or mermaid, rendering mindmap from data...');
          console.log('Mindmap data structure:', {
            hasNodes: !!artifact.data.nodes,
            hasEdges: !!artifact.data.edges,
            nodeCount: artifact.data.nodes?.length,
            edgeCount: artifact.data.edges?.length
          });
          
          try {
            console.log('Calling renderMindmap with data:', artifact.data);
            const result = await renderMindmap(artifact.data, 'svg');
            console.log('Render result:', result);
            // svg_base64 might not be available in the new implementation
            svgBase64 = (result as any).svg_base64 || null;
            console.log('Extracted SVG:', { 
              hasSvg: !!svgBase64, 
              hasMermaid: !!result.mermaid,
              svgLength: svgBase64?.length,
              svgPreview: svgBase64?.substring(0, 100)
            });
          } catch (renderError) {
            console.error('Failed to render mindmap:', renderError);
            const errorMsg = renderError instanceof Error ? renderError.message : String(renderError);
            console.error('Full error:', errorMsg);
            
            // Check if it's a network error
            if (errorMsg.includes('fetch') || errorMsg.includes('network') || errorMsg.includes('ECONNREFUSED')) {
              alert('Cannot connect to AI engine. Make sure the AI backend is running on port 8000. Error: ' + errorMsg);
            } else {
              alert('Failed to render mindmap. Error: ' + errorMsg + '. Check console for details.');
            }
          }
        }
        
        if (svgBase64) {
          console.log('Exporting SVG, length:', svgBase64.length);
          try {
            // Convert base64 SVG to blob
            const svgData = atob(svgBase64);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(svgBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            console.log('SVG exported successfully');
            setIsExporting(false);
            return;
          } catch (exportError) {
            console.error('Failed to export SVG:', exportError);
            alert('Failed to create SVG file. Exporting as JSON instead.');
          }
        } else {
          console.warn('No SVG data available after all attempts');
          alert('Could not generate SVG image. Exporting as JSON instead.');
        }
      }
      
      // For other artifacts or mindmaps without SVG, export as JSON
      console.log('Exporting as JSON');
      const dataStr = JSON.stringify(artifact, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    setIsSharing(true);
    try {
      // Generate shareable link (using current URL with artifact ID)
      const shareUrl = `${window.location.origin}${window.location.pathname}?artifact=${artifact.id}`;
      
      if (navigator.share) {
        navigator.share({
          title: artifact.title,
          text: `Check out this ${artifact.type} artifact`,
          url: shareUrl,
        }).catch(console.error);
      } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert('Link copied to clipboard!');
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const renderContent = () => {
    // TODO: Implement specific renderers for each artifact type
    switch (artifact.type) {
      case 'flashcards':
        console.log('Rendering flashcards artifact:', artifact);
        console.log('Flashcards data:', artifact.data);
        console.log('Flashcards cards:', artifact.data?.cards);
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">🎴</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Flashcards</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {artifact.data?.cards?.length || 0} cards
                </p>
              </div>
            </div>
            {artifact.data && artifact.data.cards && artifact.data.cards.length > 0 ? (
              <FlashcardViewer cards={artifact.data.cards} />
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No flashcards available</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Data: {JSON.stringify(artifact.data)}</p>
              </div>
            )}
          </div>
        );

      case 'quiz':
        console.log('Rendering quiz artifact:', artifact);
        console.log('Quiz data:', artifact.data);
        console.log('Quiz questions:', artifact.data?.questions);
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">📝</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Practice Quiz</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {artifact.data?.questions?.length || 0} questions
                </p>
              </div>
            </div>
            {artifact.data && artifact.data.questions && artifact.data.questions.length > 0 ? (
              <QuizCard 
                questions={artifact.data.questions}
                onComplete={(score) => console.log('Quiz completed with score:', score)}
              />
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No quiz questions available</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Data: {JSON.stringify(artifact.data)}</p>
              </div>
            )}
          </div>
        );

      case 'mindmap':
        console.log('Rendering mindmap artifact:', artifact);
        console.log('Mindmap data:', artifact.data);
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">🧠</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Mind Map</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {artifact.data?.nodes?.length || 0} nodes
                </p>
              </div>
            </div>
            {artifact.data && (artifact.data.nodes || artifact.data.children) ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm min-h-[500px]">
                <MindMapViewer 
                  mindmapJson={artifact.data}
                  format="both"
                  className="w-full"
                />
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No mind map data available</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Data: {JSON.stringify(artifact.data)}</p>
              </div>
            )}
          </div>
        );

      case 'course-finder':
        // Parse course data from artifact data
        const getCourses = (): CourseInfo[] => {
          if (!artifact.data) return [];
          
          // If data is already an array of courses
          if (Array.isArray(artifact.data)) {
            return artifact.data;
          }
          
          // If data is a string (markdown or plain text), parse it
          if (typeof artifact.data === 'string') {
            const { courses } = extractCoursesFromMarkdown(artifact.data);
            return courses;
          }
          
          // If data is an object with a courses property
          if (artifact.data.courses && Array.isArray(artifact.data.courses)) {
            return artifact.data.courses;
          }
          
          return [];
        };

        const courses = getCourses();

        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">🎓</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Course Recommendations</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {courses.length} courses found
                </p>
              </div>
            </div>
            {courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courses.map((course, index) => (
                  <CourseCard key={index} course={course} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No courses available</p>
              </div>
            )}
          </div>
        );

      case 'reports':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-5xl">📊</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Study Report</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Comprehensive analysis</p>
              </div>
            </div>
            {artifact.data ? (
              <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-headings:font-black prose-headings:text-slate-800 dark:prose-headings:text-slate-200 prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-strong:text-slate-800 dark:prose-strong:text-slate-200 prose-ul:my-3 prose-ol:my-3 prose-li:my-1">
                <div className="bg-gradient-to-br from-orange-50 dark:from-orange-900/20 to-white dark:to-slate-900 p-6 rounded-2xl border-2 border-orange-100 dark:border-orange-800 shadow-sm">
                  {typeof artifact.data === 'string' ? (
                    <div dangerouslySetInnerHTML={{ __html: artifact.data }} />
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(artifact.data, null, 2)}</pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">Report data not available</p>
              </div>
            )}
          </div>
        );

      case 'infographic':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="text-5xl">📈</div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-200">Infographic</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Visual summary</p>
              </div>
            </div>
            <InfographicViewer infographic={artifact.data} />
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div className="text-center text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 text-center">
              {artifact.type}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
              Viewer coming soon...
            </p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <Badge variant="indigo" className="text-sm">
              {artifact.type.replace('-', ' ').toUpperCase()}
            </Badge>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-200">{artifact.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {typeof onEdit === 'function' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(artifact.id)}
                className="mr-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.414 2.586a2 2 0 010 2.828l-9.9 9.9a1 1 0 01-.465.263l-4 1a1 1 0 01-1.213-1.213l1-4a1 1 0 01.263-.465l9.9-9.9a2 2 0 012.828 0zM15.121 4.05l-9.9 9.9L4 15l.05-1.221 9.9-9.9 1.171 1.171z" />
                </svg>
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ICONS.close className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          {renderContent()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Created {new Date(artifact.createdAt).toLocaleString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="flex gap-2">
            {canAddToBoard && (
              <Button variant="outline" size="sm" onClick={handleAddToBoardClick}>
                <ICONS.StudyBoard className="w-4 h-4 mr-2" />
                Add to Study Board
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
            >
              <ICONS.download className="w-4 h-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleShare}
              disabled={isSharing}
            >
              <ICONS.share className="w-4 h-4 mr-2" />
              {isSharing ? 'Sharing...' : 'Share'}
            </Button>
            {onDelete && (
              <Button 
                variant="danger" 
                size="sm"
                onClick={() => {
                  onDelete(artifact.id);
                  onClose();
                }}
              >
                <ICONS.trash className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      <BoardPickerModal
        isOpen={isBoardPickerOpen}
        onClose={() => setIsBoardPickerOpen(false)}
        onSelectBoard={handleSelectBoard}
        title="Add to Study Board"
      />
    </div>
  );
};

export default ArtifactViewer;
