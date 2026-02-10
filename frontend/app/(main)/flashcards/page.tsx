'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ICONS } from '@/constants';
import { 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw,
  Trash2,
  Edit,
  Check,
  X
} from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deck: string;
  mastery: number;
  lastReviewed?: Date;
}

interface FlashcardDeck {
  id: string;
  name: string;
  description: string;
  cards: Flashcard[];
  color: string;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([
    {
      id: '1',
      name: 'Biology Basics',
      description: 'Cell structure and functions',
      color: 'emerald',
      cards: [
        { id: '1-1', front: 'What is a cell?', back: 'The basic structural and functional unit of all living organisms.', deck: '1', mastery: 0 },
        { id: '1-2', front: 'What is mitochondria?', back: 'The powerhouse of the cell, responsible for energy production through cellular respiration.', deck: '1', mastery: 0 },
      ]
    },
    {
      id: '2',
      name: 'Math Formulas',
      description: 'Essential algebra formulas',
      color: 'indigo',
      cards: [
        { id: '2-1', front: 'Pythagorean theorem', back: 'a² + b² = c² (where c is the hypotenuse)', deck: '2', mastery: 0 },
      ]
    }
  ]);

  const [selectedDeck, setSelectedDeck] = useState<FlashcardDeck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: '', description: '', color: 'indigo' });
  const [newCard, setNewCard] = useState({ front: '', back: '' });
  const [editingCard, setEditingCard] = useState<string | null>(null);

  const colorClasses = {
    emerald: 'from-emerald-500 to-emerald-600 border-emerald-700',
    indigo: 'from-indigo-500 to-indigo-600 border-indigo-700',
    rose: 'from-rose-500 to-rose-600 border-rose-700',
    amber: 'from-amber-500 to-amber-600 border-amber-700',
    blue: 'from-blue-500 to-blue-600 border-blue-700',
  };

  const handleCreateDeck = () => {
    if (!newDeck.name.trim()) return;
    
    const deck: FlashcardDeck = {
      id: Date.now().toString(),
      name: newDeck.name,
      description: newDeck.description,
      color: newDeck.color as keyof typeof colorClasses,
      cards: []
    };
    
    setDecks([...decks, deck]);
    setNewDeck({ name: '', description: '', color: 'indigo' });
    setIsCreating(false);
  };

  const handleAddCard = () => {
    if (!selectedDeck || !newCard.front.trim() || !newCard.back.trim()) return;
    
    const card: Flashcard = {
      id: `${selectedDeck.id}-${Date.now()}`,
      front: newCard.front,
      back: newCard.back,
      deck: selectedDeck.id,
      mastery: 0
    };
    
    const updatedDecks = decks.map(deck => 
      deck.id === selectedDeck.id 
        ? { ...deck, cards: [...deck.cards, card] }
        : deck
    );
    
    setDecks(updatedDecks);
    setSelectedDeck({ ...selectedDeck, cards: [...selectedDeck.cards, card] });
    setNewCard({ front: '', back: '' });
  };

  const handleDeleteCard = (cardId: string) => {
    if (!selectedDeck) return;
    
    const updatedDecks = decks.map(deck => 
      deck.id === selectedDeck.id 
        ? { ...deck, cards: deck.cards.filter(c => c.id !== cardId) }
        : deck
    );
    
    setDecks(updatedDecks);
    setSelectedDeck({ ...selectedDeck, cards: selectedDeck.cards.filter(c => c.id !== cardId) });
    if (currentCardIndex >= selectedDeck.cards.length - 1) {
      setCurrentCardIndex(Math.max(0, selectedDeck.cards.length - 2));
    }
  };

  const handleDeleteDeck = (deckId: string) => {
    setDecks(decks.filter(d => d.id !== deckId));
    if (selectedDeck?.id === deckId) {
      setSelectedDeck(null);
    }
  };

  const handleNextCard = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % selectedDeck.cards.length);
  };

  const handlePrevCard = () => {
    if (!selectedDeck) return;
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + selectedDeck.cards.length) % selectedDeck.cards.length);
  };

  const handleRateMastery = (rating: number) => {
    if (!selectedDeck) return;
    
    const updatedDecks = decks.map(deck => {
      if (deck.id === selectedDeck.id) {
        return {
          ...deck,
          cards: deck.cards.map((card, idx) => 
            idx === currentCardIndex 
              ? { ...card, mastery: rating, lastReviewed: new Date() }
              : card
          )
        };
      }
      return deck;
    });
    
    setDecks(updatedDecks);
    setSelectedDeck(updatedDecks.find(d => d.id === selectedDeck.id) || null);
    setTimeout(handleNextCard, 300);
  };

  const currentCard = selectedDeck?.cards[currentCardIndex];

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 px-8 py-6 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedDeck && (
              <Button
                onClick={() => setSelectedDeck(null)}
                variant="ghost"
                className="font-bold"
              >
                <ChevronLeft size={20} />
                Back to Decks
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">
                {selectedDeck ? selectedDeck.name : 'Memory Palace'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-semibold mt-1">
                {selectedDeck 
                  ? `${selectedDeck.cards.length} cards • ${selectedDeck.description}`
                  : 'Spaced repetition flashcards for effective learning'
                }
              </p>
            </div>
          </div>
          {!selectedDeck && (
            <Button
              onClick={() => setIsCreating(true)}
              className="bg-linear-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black border-b-4 border-indigo-700"
            >
              <Plus size={20} className="mr-2" />
              New Deck
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {!selectedDeck ? (
          /* Deck Selection View */
          <div className="max-w-7xl mx-auto">
            {isCreating && (
              <Card className="mb-8 border-2 border-indigo-200 dark:border-indigo-800">
                <CardHeader>
                  <CardTitle className="font-black text-xl">Create New Deck</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Deck name (e.g., Biology Basics)"
                    value={newDeck.name}
                    onChange={(e) => setNewDeck({ ...newDeck, name: e.target.value })}
                    className="font-semibold"
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={newDeck.description}
                    onChange={(e) => setNewDeck({ ...newDeck, description: e.target.value })}
                    className="font-semibold"
                  />
                  <div className="flex gap-2">
                    {Object.keys(colorClasses).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewDeck({ ...newDeck, color })}
                        className={`w-10 h-10 rounded-xl bg-linear-to-br ${colorClasses[color as keyof typeof colorClasses]} ${newDeck.color === color ? 'ring-4 ring-offset-2 ring-indigo-300' : ''}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleCreateDeck} className="font-bold">
                      <Check size={18} className="mr-2" />
                      Create
                    </Button>
                    <Button onClick={() => setIsCreating(false)} variant="outline" className="font-bold">
                      <X size={18} className="mr-2" />
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {decks.map(deck => (
                <Card 
                  key={deck.id}
                  className="cursor-pointer hover:shadow-xl transition-all border-2 group"
                  onClick={() => setSelectedDeck(deck)}
                >
                  <CardHeader className={`bg-linear-to-br ${colorClasses[deck.color as keyof typeof colorClasses]} text-white rounded-t-lg border-b-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="font-black text-xl">{deck.name}</CardTitle>
                        <p className="text-white/80 text-sm font-semibold mt-1">{deck.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDeck(deck.id);
                        }}
                        className="text-white hover:bg-white/20"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-600 dark:text-slate-400">
                        {deck.cards.length} cards
                      </span>
                      <span className="text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        Study now →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          /* Study Mode View */
          <div className="max-w-4xl mx-auto space-y-6">
            {selectedDeck.cards.length === 0 ? (
              <Card className="text-center py-12 border-2 border-dashed">
                <CardContent>
                  <ICONS.Flashcards size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                  <h3 className="text-xl font-black text-slate-600 dark:text-slate-400 mb-2">No cards yet</h3>
                  <p className="text-slate-500 dark:text-slate-500 font-semibold">Add your first flashcard below</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Progress */}
                <div className="text-center font-bold text-slate-500 dark:text-slate-400">
                  Card {currentCardIndex + 1} of {selectedDeck.cards.length}
                </div>

                {/* Flashcard */}
                <div 
                  className="perspective-1000 cursor-pointer"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className={`relative transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    {/* Front */}
                    <Card className={`min-h-100 flex items-center justify-center p-12 border-4 ${!isFlipped ? 'block' : 'hidden'}`}>
                      <CardContent>
                        <div className="text-center">
                          <p className="text-sm font-black text-slate-400 dark:text-slate-500 mb-4">QUESTION</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {currentCard?.front}
                          </p>
                          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-8">
                            Click to reveal answer
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Back */}
                    <Card className={`min-h-100 flex items-center justify-center p-12 border-4 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 ${isFlipped ? 'block' : 'hidden'}`}>
                      <CardContent>
                        <div className="text-center">
                          <p className="text-sm font-black text-indigo-400 dark:text-indigo-500 mb-4">ANSWER</p>
                          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {currentCard?.back}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Navigation & Mastery */}
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handlePrevCard}
                    disabled={selectedDeck.cards.length <= 1}
                    variant="outline"
                    className="font-bold"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </Button>

                  {isFlipped && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRateMastery(1)}
                        className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
                      >
                        Hard
                      </Button>
                      <Button
                        onClick={() => handleRateMastery(2)}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                      >
                        Good
                      </Button>
                      <Button
                        onClick={() => handleRateMastery(3)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                      >
                        Easy
                      </Button>
                    </div>
                  )}

                  <Button
                    onClick={handleNextCard}
                    disabled={selectedDeck.cards.length <= 1}
                    variant="outline"
                    className="font-bold"
                  >
                    Next
                    <ChevronRight size={20} />
                  </Button>
                </div>
              </>
            )}

            {/* Add New Card */}
            <Card className="border-2 border-indigo-200 dark:border-indigo-800">
              <CardHeader>
                <CardTitle className="font-black text-lg">Add New Card</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 block">Question (Front)</label>
                  <Input
                    placeholder="What do you want to remember?"
                    value={newCard.front}
                    onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                    className="font-semibold"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 block">Answer (Back)</label>
                  <Textarea
                    placeholder="The answer or explanation"
                    value={newCard.back}
                    onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                    className="font-semibold"
                  />
                </div>
                <Button 
                  onClick={handleAddCard}
                  disabled={!newCard.front.trim() || !newCard.back.trim()}
                  className="w-full font-bold"
                >
                  <Plus size={18} className="mr-2" />
                  Add Card
                </Button>
              </CardContent>
            </Card>

            {/* Card List */}
            {selectedDeck.cards.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-black text-lg">All Cards in Deck</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedDeck.cards.map((card, idx) => (
                      <div
                        key={card.id}
                        className={`flex items-start justify-between p-4 rounded-lg border-2 transition-all ${
                          idx === currentCardIndex 
                            ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100">{card.front}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">{card.back}</p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCurrentCardIndex(idx);
                              setIsFlipped(false);
                            }}
                            className="font-bold"
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCard(card.id)}
                            className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

