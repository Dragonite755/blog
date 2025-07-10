import mongoose from 'mongoose'
import { describe, expect, test, beforeEach } from '@jest/globals'

import {
  createPost,
  listAllPosts,
  listPostsByAuthor,
  listPostsByTag,
  getPostById,
  updatePost,
  deletePost,
} from '../services/posts.js'
import { Post } from '../db/models/post.js'
import { User } from '../db/models/user.js'

describe('creating posts', () => {
  let testUser

  beforeEach(async () => {
    await User.deleteMany()
    testUser = await User.create({
      username: 'DanielBugl',
      password: 'Password',
    })
  })

  test('with all parameters should succeed', async () => {
    const post = {
      title: 'Hello Mongoose!',
      author: testUser._id,
      contents: 'This post is stored in a MongoDB database using Mongoose.',
      tags: ['mongoose', 'mongodb'],
    }
    const createdPost = await createPost(post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)

    const foundPost = await Post.findById(createdPost._id)
    expect(foundPost).toEqual(expect.objectContaining(post))
    expect(foundPost.createdAt).toBeInstanceOf(Date)
    expect(foundPost.updatedAt).toBeInstanceOf(Date)
  })

  test('without title should fail', async () => {
    const post = {
      author: testUser._id,
      contents: 'Post with no title.',
      tags: ['empty'],
    }

    try {
      await createPost(post)
    } catch (err) {
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError)
      expect(err.message).toContain('`title` is required')
    }
  })

  test('without author should fail', async () => {
    const post = {
      title: 'Hello Mongoose!',
      contents: 'Post with no author.',
      tags: ['empty'],
    }

    try {
      await createPost(post)
    } catch (err) {
      expect(err).toBeInstanceOf(mongoose.Error.ValidationError)
      expect(err.message).toContain('`author` is required')
    }
  })

  test('with minimal parameters should succeed', async () => {
    const post = {
      title: 'Title',
      author: testUser._id,
    }
    const createdPost = await createPost(post)
    expect(createdPost._id).toBeInstanceOf(mongoose.Types.ObjectId)
  })
})

const sampleUsers = [
  {
    username: 'DanielBugl',
    password: 'full-stack',
  },
  {
    username: 'Joey',
    password: 'Password',
  },
]

const samplePosts = [
  {
    title: 'Learning Redux',
    authorUsername: 'DanielBugl',
    tags: ['redux'],
  },
  {
    title: 'Learn React Hooks',
    authorUsername: 'DanielBugl',
    tags: ['react'],
  },
  {
    title: 'Full-Stack React Projects',
    authorUsername: 'DanielBugl',
    tags: ['react', 'nodejs'],
  },
  {
    title: 'Guide to TypeScript',
    authorUsername: 'Joey',
  },
]

let createdSamplePosts = []
let userMap = {}

beforeEach(async () => {
  await Post.deleteMany({})
  await User.deleteMany({})

  userMap = {}
  for (const user of sampleUsers) {
    const createdUser = new User(user)
    userMap[user.username] = await createdUser.save()
  }

  createdSamplePosts = []
  for (const post of samplePosts) {
    const author = userMap[post.authorUsername]._id
    const createdPost = new Post({ ...post, author })
    createdSamplePosts.push(await createdPost.save())
  }
})

describe('listing posts', () => {
  test('should return all posts', async () => {
    const posts = await listAllPosts()
    expect(posts.length).toEqual(createdSamplePosts.length)
  })

  test('should return posts sorted by creation date descending by default', async () => {
    const posts = await listAllPosts()
    const sortedSamplePosts = createdSamplePosts.sort(
      (a, b) => b.createdAt - a.createdAt,
    )
    expect(posts.map((post) => post.updatedAt)).toEqual(
      sortedSamplePosts.map((post) => post.updatedAt),
    )
  })

  test('should take into account provided sorting options', async () => {
    const posts = await listAllPosts({
      sortBy: 'updatedAt',
      sortOrder: 'ascending',
    })
    const sortedSamplePosts = createdSamplePosts.sort(
      (a, b) => a.updatedAt - b.updatedAt,
    )
    expect(posts.map((post) => post.updatedAt)).toEqual(
      sortedSamplePosts.map((post) => post.updatedAt),
    )
  })

  test('should be able to filter posts by author', async () => {
    const authorId = userMap['DanielBugl']._id // ID of author with username 'DanielBugl'
    const posts = await listPostsByAuthor(authorId)
    expect(posts.length).toBe(3) // Test that 3 users have this author
    posts.forEach((post) => {
      // Test that each post's author is this user
      expect(post.author.toString()).toBe(authorId.toString())
    })
  })

  test('should be able to filter posts by tag', async () => {
    const posts = await listPostsByTag('nodejs')
    expect(posts.length).toBe(1)
  })
})

describe('getting a post', () => {
  test('should return the full post', async () => {
    const post = await getPostById(createdSamplePosts[0]._id)
    expect(post.toObject()).toEqual(createdSamplePosts[0].toObject())
  })

  test('should fail if the id does not exist', async () => {
    const post = await getPostById('000000000000000000000000')
    expect(post).toEqual(null)
  })
})

describe('updating posts', () => {
  let newAuthor

  beforeEach(async () => {
    newAuthor = await User.create({
      username: 'NewAuthor',
      password: 'NewPassword',
    })
  })

  test('should update the specified property', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: newAuthor._id,
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.author.toString()).toEqual(newAuthor._id.toString())
  })

  test('should not update other properties', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: newAuthor._id,
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.title).toEqual('Learning Redux')
  })

  test('should update the updatedAt timestamp', async () => {
    await updatePost(createdSamplePosts[0]._id, {
      author: newAuthor._id,
    })
    const updatedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(updatedPost.updatedAt.getTime()).toBeGreaterThan(
      createdSamplePosts[0].updatedAt.getTime(),
    )
  })

  test('should fail if the id does not exist', async () => {
    const post = await updatePost('000000000000000000000000', {
      author: newAuthor._id,
    })
    expect(post).toEqual(null)
  })
})

describe('deleting posts', () => {
  test('should remove the post from the database', async () => {
    const result = await deletePost(createdSamplePosts[0]._id)
    expect(result.deletedCount).toEqual(1)
    const deletedPost = await Post.findById(createdSamplePosts[0]._id)
    expect(deletedPost).toEqual(null)
  })

  test('should fail if the id does not exist', async () => {
    const result = await deletePost('000000000000000000000000')
    expect(result.deletedCount).toEqual(0)
  })
})
