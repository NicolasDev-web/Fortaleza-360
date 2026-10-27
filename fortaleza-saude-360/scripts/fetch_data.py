"""Template seguro: coleta real deve seguir docs/DATA_SOURCES.md e tarefa SDD.
Não invente endpoint de download nem faça scrape de links dinâmicos.
"""
from pathlib import Path
if __name__ == '__main__':
    print('Aguardando validação de URLs, licenças e schema das fontes. Consulte sdd/tasks/016.md.')
    Path('data/raw').mkdir(parents=True, exist_ok=True)
