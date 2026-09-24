import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  ConfigProvider,
  Form,
  Layout,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd';
import {
  BookOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  CrownOutlined,
  ExperimentOutlined,
  FlagFilled,
  ReloadOutlined
} from '@ant-design/icons';
import { getAccessToken } from '@/api/client';
import { AbilityRadar } from '@/components/AbilityRadar';
import { useBankStore } from '@/store/useBankStore';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

function App() {
  const {
    dashboard,
    loading,
    error,
    draft,
    answers,
    unsure,
    currentIndex,
    report,
    submitted,
    saveState,
    submitting,
    loadDashboard,
    demoLogin,
    restoreDraft,
    generatePaper,
    selectAnswer,
    toggleUnsure,
    submitExam,
    flushSave
  } = useBankStore();
  const questionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [difficulty, setDifficulty] = useState('中级');
  const [amount, setAmount] = useState(10);

  useEffect(() => {
    loadDashboard();
    restoreDraft();
  }, [loadDashboard, restoreDraft]);

  useEffect(() => {
    function persistOnLeave() {
      void flushSave();
    }
    function persistWhenHidden() {
      if (document.visibilityState === 'hidden') void flushSave();
    }
    window.addEventListener('pagehide', persistOnLeave);
    document.addEventListener('visibilitychange', persistWhenHidden);
    return () => {
      window.removeEventListener('pagehide', persistOnLeave);
      document.removeEventListener('visibilitychange', persistWhenHidden);
    };
  }, [flushSave]);

  useEffect(() => {
    if (draft) {
      setDifficulty(draft.difficulty);
      setAmount(draft.amount);
    }
  }, [draft]);

  useEffect(() => {
    if (draft && !submitted) {
      const timer = setTimeout(() => scrollToQuestion(currentIndex), 200);
      return () => clearTimeout(timer);
    }
  }, [draft, submitted, currentIndex]);

  const paper = draft?.paper ?? [];
  const answeredCount = useMemo(
    () => paper.filter((question) => answers[question.id]).length,
    [paper, answers]
  );

  function scrollToQuestion(index: number) {
    questionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const saveMessage = {
    idle: '',
    saving: '自动保存中…',
    saved: '草稿已自动保存，换设备登录也可继续',
    error: '自动保存失败，请检查网络后继续作答'
  }[saveState];

  return (
    <ConfigProvider theme={{ token: { borderRadius: 8, colorPrimary: '#2f6b57' } }}>
      <Layout className="page">
        <Content className="shell">
          <section className="hero">
            <div>
              <Text className="eyebrow">GXLogic Bank</Text>
              <Title>逻辑推理题库系统</Title>
              <Paragraph>题型分类、智能组卷、答题解析、错题追踪、模拟考试和段位排名整合在同一个练习台。</Paragraph>
            </div>
            <Space wrap>
              <Button icon={<ReloadOutlined />} loading={loading} onClick={loadDashboard}>刷新</Button>
              <Button type="primary" icon={<CrownOutlined />} onClick={demoLogin}>演示登录</Button>
            </Space>
          </section>

          {error && <Alert type="error" message={error} showIcon className="block" />}

          {dashboard && (
            <>
              <Row gutter={[16, 16]} className="block">
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="累计答题" value={dashboard.profile.totalAnswered} prefix={<BookOutlined />} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="正确率" value={dashboard.profile.correctRate} suffix="%" /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="连续正确天数" value={dashboard.profile.streakDays} prefix={<ClockCircleOutlined />} /></Card></Col>
                <Col xs={24} sm={12} lg={6}><Card><Statistic title="当前段位" value={dashboard.profile.tier} prefix={<CrownOutlined />} /></Card></Col>
              </Row>

              <Row gutter={[16, 16]} className="block">
                <Col xs={24} lg={15}>
                  <Card
                    title="智能组卷练习"
                    extra={
                      <Space>
                        {getAccessToken() && <Tag color="green">演示账号已登录</Tag>}
                        <Tag color={submitted ? 'default' : 'gold'}>
                          {submitted ? '已交卷' : `已答 ${answeredCount}/${paper.length || 0}`}
                        </Tag>
                      </Space>
                    }
                  >
                    <Form layout="inline" className="paper-form">
                      <Form.Item label="难度">
                        <Select
                          value={difficulty}
                          onChange={setDifficulty}
                          options={['入门', '初级', '中级', '高级', '专家'].map((value) => ({ value, label: value }))}
                        />
                      </Form.Item>
                      <Form.Item label="题量">
                        <Select
                          value={amount}
                          onChange={setAmount}
                          options={[10, 20, 30, 50].map((value) => ({ value, label: `${value} 题` }))}
                        />
                      </Form.Item>
                      <Button type="primary" icon={<ExperimentOutlined />} onClick={() => generatePaper(difficulty, amount)}>
                        {draft && !submitted ? '放弃草稿并重新组卷' : '生成试卷'}
                      </Button>
                    </Form>

                    {!draft && (
                      <Alert
                        type="info"
                        showIcon
                        className="block"
                        message="选择难度和题量后生成试卷"
                        description="答案、不确定标记和未完成位置会自动保存到账号；重新打开页面或换一台电脑登录，都可以继续作答。"
                      />
                    )}

                    {draft && saveMessage && (
                      <Alert
                        type={saveState === 'error' ? 'warning' : 'success'}
                        showIcon
                        className="block"
                        message={saveMessage}
                      />
                    )}

                    {draft && (
                      <>
                        <div className="question-nav">
                          {paper.map((question, index) => {
                            const answered = Boolean(answers[question.id]);
                            const isUnsure = unsure.includes(question.id);
                            return (
                              <button
                                key={question.id}
                                type="button"
                                title={`第 ${index + 1} 题`}
                                className={[
                                  'question-nav-item',
                                  answered ? 'answered' : '',
                                  isUnsure ? 'unsure' : '',
                                  index === currentIndex ? 'current' : ''
                                ].join(' ')}
                                onClick={() => scrollToQuestion(index)}
                              >
                                {index + 1}
                              </button>
                            );
                          })}
                        </div>

                        {!submitted && (
                          <Alert
                            type="warning"
                            showIcon
                            className="block"
                            message={`未完成位置：第 ${currentIndex + 1} 题`}
                            description="题号导航中高亮的是第一道未完成题；黄色边框表示标记了不确定。"
                          />
                        )}

                        <Space direction="vertical" size={16} className="question-list">
                          {paper.map((question, index) => {
                            const isUnsure = unsure.includes(question.id);
                            const isCurrent = index === currentIndex && !submitted;
                            return (
                              <div
                                key={question.id}
                                ref={(node) => {
                                  questionRefs.current[index] = node;
                                }}
                                className={[
                                  'question-card-wrap',
                                  isCurrent ? 'current-question' : '',
                                  isUnsure ? 'unsure-question' : ''
                                ].join(' ')}
                              >
                                <Card size="small">
                                  <Space wrap className="question-meta">
                                    <Tag>{question.type}</Tag>
                                    <Tag color="blue">{question.difficulty}</Tag>
                                    <Tag color="gold">{question.knowledge}</Tag>
                                    {answers[question.id] && <Tag color="green" icon={<CheckCircleFilled />}>已作答</Tag>}
                                    {isCurrent && <Tag color="orange">未完成位置</Tag>}
                                  </Space>
                                  <div className="question-heading">
                                    <Title level={5}>{index + 1}. {question.stem}</Title>
                                    <Button
                                      size="small"
                                      type={isUnsure ? 'primary' : 'default'}
                                      danger={isUnsure}
                                      icon={<FlagFilled />}
                                      disabled={submitted}
                                      onClick={() => toggleUnsure(question.id)}
                                    >
                                      {isUnsure ? '取消不确定' : '标记不确定'}
                                    </Button>
                                  </div>
                                  <Radio.Group
                                    value={answers[question.id]}
                                    disabled={submitted}
                                    onChange={(event) => selectAnswer(question.id, event.target.value as string)}
                                  >
                                    <Space direction="vertical">
                                      {question.options.map((option) => <Radio key={option} value={option}>{option}</Radio>)}
                                    </Space>
                                  </Radio.Group>
                                  <Paragraph className="explain">解析：{question.explanation}</Paragraph>
                                </Card>
                              </div>
                            );
                          })}
                        </Space>

                        <Button
                          type="primary"
                          size="large"
                          className="submit"
                          loading={submitting}
                          onClick={submitExam}
                        >
                          {submitted ? '重复提交（返回原报告）' : '提交并生成报告'}
                        </Button>

                        {report && (
                          <Alert
                            type="success"
                            showIcon
                            className="block"
                            message={`考试报告：${report.score} 分（${report.correct}/${report.total}）`}
                            description={
                              <Space direction="vertical" size={4}>
                                <Text>{report.rank_hint}</Text>
                                <Text>{report.analysis.join('；')}</Text>
                                <Text type="secondary">草稿已失效；重复提交本试卷仍会返回同一份报告。</Text>
                              </Space>
                            }
                          />
                        )}
                      </>
                    )}
                  </Card>
                </Col>

                <Col xs={24} lg={9}>
                  <Card title="学习进度雷达">
                    <AbilityRadar data={dashboard.radar} />
                  </Card>
                  <Card title="题型分类题库" className="stacked">
                    {dashboard.categories.map((category) => (
                      <div className="category-row" key={category.id}>
                        <Text>{category.name}</Text>
                        <Progress percent={category.accuracy} size="small" />
                      </div>
                    ))}
                  </Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]} className="block">
                <Col xs={24} lg={12}>
                  <Card title="错题本与收藏">
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={dashboard.wrongBook}
                      pagination={false}
                      columns={[
                        { title: '题目', dataIndex: 'title' },
                        { title: '类型', dataIndex: 'type', width: 110 },
                        { title: '错误次数', dataIndex: 'mistakes', width: 90 },
                        { title: '最后练习', dataIndex: 'lastPracticed', width: 110 }
                      ]}
                    />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="排行榜与段位">
                    <Table
                      size="small"
                      rowKey="rank"
                      dataSource={dashboard.rankings}
                      pagination={false}
                      columns={[
                        { title: '#', dataIndex: 'rank', width: 54 },
                        { title: '用户', dataIndex: 'name' },
                        { title: '段位', dataIndex: 'tier', width: 90 },
                        { title: '得分', dataIndex: 'score', width: 90 },
                        { title: '正确率', dataIndex: 'accuracy', width: 90, render: (value) => `${value}%` }
                      ]}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
