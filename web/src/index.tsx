/* @refresh reload */
import { render } from 'solid-js/web';
import { Router, Route } from '@solidjs/router';
import { lazy, Suspense, ErrorBoundary } from 'solid-js';
import './app.css';
import { Layout } from './components/Layout';
import { Skeleton, ErrorState } from './components/ui';

import Home from './routes/Home';
const Blocks = lazy(() => import('./routes/Blocks'));
const Block = lazy(() => import('./routes/Block'));
const Txs = lazy(() => import('./routes/Txs'));
const Tx = lazy(() => import('./routes/Tx'));
const Accounts = lazy(() => import('./routes/Accounts'));
const Account = lazy(() => import('./routes/Account'));
const Validators = lazy(() => import('./routes/Validators'));
const ValidatorPage = lazy(() => import('./routes/Validator'));
const Rewards = lazy(() => import('./routes/Rewards'));
const ProviderPage = lazy(() => import('./routes/Provider'));
const FounderPage = lazy(() => import('./routes/Founder'));
const Governance = lazy(() => import('./routes/Governance'));
const ProposalPage = lazy(() => import('./routes/Proposal'));
const NetworkPage = lazy(() => import('./routes/Network'));
const Docs = lazy(() => import('./routes/Docs'));
const Status = lazy(() => import('./routes/Status'));
const Brand = lazy(() => import('./routes/Brand'));
const Resolve = lazy(() => import('./routes/Resolve'));

const root = document.getElementById('root');
if (!root) throw new Error('#root missing');

render(
  () => (
    <Router
      root={(props) => (
        <Layout>
          <ErrorBoundary fallback={(err, reset) => <ErrorState error={err} retry={reset} />}>
            <Suspense fallback={<Skeleton rows={8} />}>{props.children}</Suspense>
          </ErrorBoundary>
        </Layout>
      )}
    >
      <Route path="/" component={Home} />
      <Route path="/blocks" component={Blocks} />
      <Route path="/blocks/:height" component={Block} />
      <Route path="/txs" component={Txs} />
      <Route path="/txs/:hash" component={Tx} />
      <Route path="/accounts" component={Accounts} />
      <Route path="/accounts/:address" component={Account} />
      <Route path="/validators" component={Validators} />
      <Route path="/validators/:operator" component={ValidatorPage} />
      <Route path="/rewards" component={Rewards} />
      <Route path="/rewards/providers/:operator" component={ProviderPage} />
      <Route path="/founder" component={FounderPage} />
      <Route path="/governance" component={Governance} />
      <Route path="/governance/:id" component={ProposalPage} />
      <Route path="/network" component={NetworkPage} />
      <Route path="/docs/*slug" component={Docs} />
      <Route path="/status" component={Status} />
      <Route path="/brand" component={Brand} />
      {/* Short links: hashgram.io/<tx hash> · /<height> · /hash1… · /@name */}
      <Route path="/*rest" component={Resolve} />
    </Router>
  ),
  root,
);
