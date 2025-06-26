# PingChain - Smart Communication Assistant

PingChain helps you maintain meaningful connections by reminding you to follow up, suggesting thoughtful responses, and tracking your communication patterns.

## Features

- Smart reminders for follow-ups
- AI-powered message drafting
- Communication pattern insights
- Social authentication
- Responsive design for web and mobile

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- GitHub account (for OAuth)
- Google account (for OAuth)
- OpenAI API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/pingchain.git
cd pingchain
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here # Generate a secure secret key

# GitHub OAuth
GITHUB_ID=your-github-client-id
GITHUB_SECRET=your-github-client-secret

# Google OAuth
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-api-key
```

4. Set up OAuth applications:
   - GitHub: Create a new OAuth app at https://github.com/settings/applications/new
   - Google: Create a new project and OAuth 2.0 credentials at https://console.cloud.google.com

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Project Structure

```
pingchain/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   ├── lib/             # Utility functions
│   └── types/           # TypeScript types
├── public/              # Static assets
└── prisma/             # Database schema
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
