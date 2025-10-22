# Housing Transparency Project

A comprehensive housing data analysis platform providing insights into building violations, evictions, complaints, and neighborhood statistics.

## Test Coverage

- **main**: [![Coverage Status](https://coveralls.io/repos/github/gcivil-nyu-org/team3-wed-fall25/badge.svg?branch=main)](https://coveralls.io/github/gcivil-nyu-org/team3-wed-fall25?branch=main)
- **devalop**: [![Coverage Status](https://coveralls.io/repos/github/gcivil-nyu-org/team3-wed-fall25/badge.svg?branch=develop)](https://coveralls.io/github/gcivil-nyu-org/team3-wed-fall25?branch=develop)

## Build Status

[![Build Status](https://app.travis-ci.com/gcivil-nyu-org/team3-wed-fall25.svg?branch=develop)](https://app.travis-ci.com/github/gcivil-nyu-org/team3-wed-fall25)

## Project Structure

- **Backend**: Django REST API with PostgreSQL database
- **Frontend**: React application for data visualization
- **Data Sources**: NYC Open Data (violations, evictions, complaints, building registrations)

## API Endpoints

### Building Data
- `GET /api/building/?bbl={bbl}` - Get building information by BBL

### Neighborhood Analytics
- `GET /api/neighborhood/stats/` - Get neighborhood statistics
- `GET /api/neighborhood/heatmap/` - Get heatmap data
- `GET /api/neighborhood/borough-summary/` - Get borough summaries
- `GET /api/neighborhood/trends/` - Get trend data

### Demo API
- `GET /api/dummy/items/` - List demo items
- `POST /api/dummy/items/` - Create demo item
- `GET /api/dummy/items/{id}/` - Get demo item
- `PUT /api/dummy/items/{id}/` - Update demo item
- `PATCH /api/dummy/items/{id}/` - Partial update demo item
- `DELETE /api/dummy/items/{id}/` - Delete demo item

## Development

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Running Tests
```bash
cd backend
python coveragerc.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## Test Coverage

Current test coverage: **80%** with **346 tests**

### Coverage Breakdown
- **Building Models**: 92% coverage
- **Building Views**: 95% coverage  
- **Neighborhood Views**: 94% coverage
- **Postgres Infrastructure**: 80% coverage
- **Common Utilities**: 97% coverage
- **Config & Middleware**: 94% coverage
- **Exceptions & Interfaces**: 100% coverage
- **Dummy API**: 59% coverage (tests)
- **Neighborhood Models**: 73% coverage

## Contributing

1. Create a feature branch
2. Add tests for new functionality
3. Ensure all tests pass
4. Submit a pull request

## License

This project is part of the NYU Civil Engineering curriculum.
