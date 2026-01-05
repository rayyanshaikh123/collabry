from tools.web_search import web_search

if __name__ == '__main__':
    q = 'what is an array'
    res = web_search(q, max_results=5)
    print('provider:', res.get('provider'))
    print('short_answer:', res.get('short_answer'))
    print('results:')
    for r in res.get('results', []):
        print('-', r.get('title'))
