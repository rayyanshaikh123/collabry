'use client';

import React, { useState } from 'react';
import { Button, Card, Badge } from '../UIElements';
import { ICONS } from '../../constants';
import { Artifact } from './StudioPanel';
import FlashcardViewer from './FlashcardViewer';
import QuizCard from './QuizCard';
import MindMapViewer from './MindMapViewer';
import CourseCard from './CourseCard';

interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

const ArtifactViewer: React.FC<ArtifactViewerProps> = ({ artifact, onClose }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    try {
      // Export as JSON
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
              </div>
            )}
          </div>
        );

      case 'quiz':
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
              </div>
            )}
          </div>
        );

      case 'mindmap':
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
              </div>
            )}
          </div>
        );

      case 'course-finder':
        // Parse course data from markdown or stored data
        const parseCourses = (data: any) => {
          if (typeof data === 'string') {
            // Parse markdown format: [Course Name](URL) - Platform: X | Rating: X/5 | Price: $X
            const courseRegex = /\[([^\]]+)\]\(([^)]+)\)\s*-\s*Platform:\s*([^|]+)\|\s*Rating:\s*([^|]+)\|\s*Price:\s*(.+?)(?=\n|$)/g;
            const courses = [];
            let match;
            while ((match = courseRegex.exec(data)) !== null) {
              courses.push({
                title: match[1].trim(),
                url: match[2].trim(),
                platform: match[3].trim(),
                rating: match[4].trim(),
                price: match[5].trim(),
              });
            }
            return courses;
          }
          return Array.isArray(data) ? data : [];
        };

        const courses = parseCourses(artifact.data);

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
                {courses.map((course: any, index: number) => (
                  <a
                    key={index}
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-6 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-black text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {course.title}
                      </h4>
                      <ICONS.externalLink className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-shrink-0 ml-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="px-3 py-1 bg-white dark:bg-slate-800 rounded-full font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {course.platform}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <ICONS.star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold">{course.rating}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-green-600 dark:text-green-400">{course.price}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400">No courses found</p>
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
          <div className="space-y-8">
            {artifact.data && typeof artifact.data === 'object' && 'title' in artifact.data ? (
              <div className="space-y-8">
                {/* Hero Title Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 p-12 text-center shadow-2xl">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnpNNiA2YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjEiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
                  <div className="relative z-10">
                    <div className="inline-block mb-4 text-7xl">📊</div>
                    <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{artifact.data.title}</h1>
                    {artifact.data.subtitle && (
                      <p className="text-xl text-white/95 font-semibold max-w-2xl mx-auto">{artifact.data.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Stats Overview Cards */}
                {artifact.data.sections && artifact.data.sections.some((s: any) => s.stats?.length) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {artifact.data.sections.flatMap((section: any) => section.stats || []).slice(0, 4).map((stat: any, idx: number) => {
                      const colors = ['blue', 'green', 'purple', 'orange', 'pink', 'cyan'];
                      const color = colors[idx % colors.length];
                      return (
                        <div key={idx} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-${color}-400 to-${color}-600 p-6 shadow-xl transform hover:scale-105 transition-transform`}>
                          <div className="relative z-10">
                            <p className="text-5xl font-black text-white mb-2">{stat.value}</p>
                            <p className="text-sm font-bold text-white/90 uppercase tracking-wide">{stat.label}</p>
                          </div>
                          <div className="absolute -right-4 -bottom-4 text-9xl opacity-10">📈</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Main Content Sections */}
                {artifact.data.sections?.map((section: any, idx: number) => {
                  const sectionColors = [
                    { bg: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20', border: 'border-blue-200 dark:border-blue-800', accent: 'bg-blue-500' },
                    { bg: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20', border: 'border-purple-200 dark:border-purple-800', accent: 'bg-purple-500' },
                    { bg: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20', border: 'border-green-200 dark:border-green-800', accent: 'bg-green-500' },
                    { bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20', border: 'border-orange-200 dark:border-orange-800', accent: 'bg-orange-500' },
                  ];
                  const colorScheme = sectionColors[idx % sectionColors.length];

                  return (
                    <div key={section.id || idx} className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${colorScheme.bg} p-8 border-2 ${colorScheme.border} shadow-lg`}>
                      {/* Section Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={`w-16 h-16 ${colorScheme.accent} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
                          {section.icon}
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200">{section.title}</h2>
                      </div>

                      {/* Stats with Visual Bars */}
                      {section.stats && section.stats.length > 0 && (
                        <div className="mb-6 space-y-4">
                          {section.stats.map((stat: any, statIdx: number) => {
                            const percentage = typeof stat.value === 'string' && stat.value.includes('%') 
                              ? parseInt(stat.value) 
                              : Math.random() * 40 + 60; // Random between 60-100 for visual effect
                            
                            return (
                              <div key={statIdx} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4 rounded-xl border border-white/40 dark:border-slate-700/40">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-black text-slate-700 dark:text-slate-300">{stat.label}</span>
                                  <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{stat.value}</span>
                                </div>
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full ${colorScheme.accent} rounded-full transition-all duration-1000 ease-out`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Key Points with Icons */}
                      {section.keyPoints && section.keyPoints.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {section.keyPoints.map((point: string, pointIdx: number) => (
                            <div key={pointIdx} className="flex items-start gap-3 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm p-4 rounded-xl border border-white/50 dark:border-slate-700/50">
                              <div className={`w-8 h-8 ${colorScheme.accent} rounded-lg flex items-center justify-center flex-shrink-0 shadow-md`}>
                                <span className="text-white text-lg font-bold">✓</span>
                              </div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{point}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Timeline with Visual Line */}
                {artifact.data.timeline && artifact.data.timeline.length > 0 && (
                  <div className="relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-8 rounded-3xl border-2 border-indigo-200 dark:border-indigo-800 shadow-lg">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-8 flex items-center gap-3">
                      <span className="text-4xl">⏱️</span>
                      Timeline
                    </h2>
                    <div className="relative">
                      {/* Vertical Line */}
                      <div className="absolute left-20 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500"></div>
                      
                      <div className="space-y-8">
                        {artifact.data.timeline.map((item: any, idx: number) => (
                          <div key={idx} className="relative flex gap-6 items-start">
                            {/* Year Badge */}
                            <div className="w-32 flex-shrink-0">
                              <div className="inline-block bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-black text-lg shadow-lg transform -rotate-2">
                                {item.year}
                              </div>
                            </div>
                            
                            {/* Dot on Line */}
                            <div className="absolute left-20 w-5 h-5 bg-white dark:bg-slate-800 border-4 border-indigo-500 rounded-full -ml-2 mt-4 shadow-lg"></div>
                            
                            {/* Event Card */}
                            <div className="flex-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-2xl border-2 border-white/60 dark:border-slate-700/60 shadow-md ml-8">
                              <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">{item.event}</h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Comparisons Table */}
                {artifact.data.comparisons && artifact.data.comparisons.length > 0 && (
                  <div className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 p-8 rounded-3xl border-2 border-pink-200 dark:border-pink-800 shadow-lg">
                    <h2 className="text-3xl font-black text-slate-800 dark:text-slate-200 mb-8 flex items-center gap-3">
                      <span className="text-4xl">⚖️</span>
                      Comparisons
                    </h2>
                    <div className="space-y-4">
                      {artifact.data.comparisons.map((comp: any, idx: number) => (
                        <div key={idx} className="grid grid-cols-3 gap-6 items-center">
                          <div className="text-right">
                            <p className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-wide">{comp.category}</p>
                          </div>
                          <div className="relative bg-gradient-to-br from-blue-400 to-blue-600 p-5 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
                            <p className="text-center font-black text-white">{comp.optionA}</p>
                            <div className="absolute -left-2 top-1/2 -mt-2 w-4 h-4 bg-blue-500 rotate-45"></div>
                          </div>
                          <div className="relative bg-gradient-to-br from-green-400 to-green-600 p-5 rounded-xl shadow-lg transform hover:scale-105 transition-transform">
                            <p className="text-center font-black text-white">{comp.optionB}</p>
                            <div className="absolute -right-2 top-1/2 -mt-2 w-4 h-4 bg-green-500 rotate-45"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conclusion Banner */}
                {artifact.data.conclusion && (
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 p-10 shadow-2xl">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnpNNiA2YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utb3BhY2l0eT0iLjIiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-20"></div>
                    <div className="relative z-10 text-center">
                      <div className="inline-block text-6xl mb-4">💡</div>
                      <h2 className="text-3xl font-black text-white mb-4">Key Takeaway</h2>
                      <p className="text-xl text-white/95 font-semibold max-w-3xl mx-auto leading-relaxed">{artifact.data.conclusion}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="text-8xl mb-6">📈</div>
                <p className="text-xl text-slate-500 dark:text-slate-400 font-semibold">Infographic data not available</p>
              </div>
            )}
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
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ICONS.close className="w-5 h-5" />
          </Button>
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
              Share
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ArtifactViewer;
